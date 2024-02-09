const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const cors = require("cors"); // Require CORS package


const fs = require("fs");
const sharp = require("sharp");
const path = require("path");

const app = express();
const port = process.env.PORT || 5000;





app.use(cors({
  origin: 'http://127.0.0.1:5500'
})); // Use CORS middleware to enable CORS

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());




const pool = mysql.createPool({
  connectionLimit: 10,
  host: "localhost",
  user: "root",
  password: null, // Replace with your actual password
  database: "recognition3",
});

app.get("/image", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection: ", err);
      res.status(500).send("Error connecting to the database");
      return;
    }
    connection.query("SELECT * from image", (err, rows) => {
      connection.release();
      if (!err) {
        res.send(rows);
      } else {
        console.error("Error querying the database: ", err);
        res.status(500).send("Error fetching image");
      }
    });
  });
});

app.get("/image/:id", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection: ", err);
      res.status(500).send("Error connecting to the database");
      return;
    }
    connection.query("SELECT * from image WHERE id = ?", [req.params.id], (err, rows) => {
      connection.release();
      if (!err) {
        res.send(rows);
      } else {
        console.error("Error querying the database: ", err);
        res.status(500).send("Error fetching image by ID");
      }
    });
  });
});

app.post("/add-user-and-image", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Connection error: ", err);
      res.status(500).send("Error connecting to the database");
      return;
    }

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        res.status(500).send("Error starting transaction");
        return;
      }

      const { name, image } = req.body;

      // First insert the user
      connection.query("INSERT INTO user (name) VALUES (?)", [name], (err, userResults) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            console.error("Error adding user: ", err);
            res.status(500).send("Error adding the user");
          });
        }

        const userId = userResults.insertId;
        // Now insert each image
        let imageInserted = 0;

        // Helper function to insert image
        const insertImage = (imageData, callback) => {
          connection.query("INSERT INTO image (user_id, image) VALUES (?, ?)", [userId, imageData], callback);
        };

        // Loop through the image array
        image.forEach((imageData, index) => {
          insertImage(imageData, (err, imageResults) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                console.error("Error adding image: ", err);
                res.status(500).send("Error adding the image");
              });
            }

            imageInserted++;
            if (imageInserted === image.length) {
              // If all image have been inserted, commit the transaction
              connection.commit(err => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    console.error("Error committing transaction: ", err);
                    res.status(500).send("Error during transaction commit");
                  });
                }

                connection.release();
                res.json({
                  message: "User and image have been added successfully",
                  userId: userId
                });
              });
            }
            image.forEach((base64ImageData, index) => {
              // Ensure you're passing just the Base64 encoded part of the data, without the data URL scheme
              const imageData = base64ImageData.split(';base64,').pop();
              saveImageToFileSystem(name, imageData, index);
          });
          });
        });
      });
    });
  });
});



const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  
  // Start fetching and saving images for all users after server starts
  fetchAndSaveImagesForAllUsers();
});



function saveImageToFileSystem(userName, base64ImageData, index) {
  // Ensure the directory for the user exists
  const userDir = path.join(__dirname, 'labels', userName);
  if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
  }

  // Specify the path for the new image file
  const imagePath = path.join(userDir, `${index + 1}.png`);

  // Decode the Base64 image data
  const imageBuffer = Buffer.from(base64ImageData, 'base64');

  // Use sharp to convert and save the image as a PNG file
  sharp(imageBuffer)
      .png()
      .toFile(imagePath)
      .then(() => console.log(`Image saved to ${imagePath}`))
      .catch(err => console.error('Error saving image:', err));
}




// Root directory for saving user images
const rootImagesDir = path.join(__dirname, "labels");

// Ensure the root directory exists
if (!fs.existsSync(rootImagesDir)) {
  fs.mkdirSync(rootImagesDir, { recursive: true });
}

// Function to fetch images for all users, convert, and save them
function fetchAndSaveImagesForAllUsers() {
  pool.query('SELECT id FROM user', (err, userResults) => {
    if (err) {
      console.error('Error fetching users:', err);
      return;
    }

    userResults.forEach(user => {
      const userId = user.id;
      fetchUserImagesAndSave(userId);
    });
  });
}


// Function to fetch images for a user, convert, and save them
function fetchUserImagesAndSave(userId) {
  pool.query('SELECT name FROM user WHERE id = ?', [userId], (err, userResults) => {
    if (err) {
      console.error('Error fetching user:', err);
      return;
    }
    if (userResults.length === 0) {
      console.log('User not found.');
      return;
    }

    const userName = userResults[0].name;
    const userDir = path.join(rootImagesDir, userName);

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    pool.query('SELECT image FROM image WHERE user_id = ?', [userId], (err, imageResults) => {
      if (err) {
        console.error('Error fetching images:', err);
        return;
      }

      imageResults.forEach((row, index) => {
        const base64Data = row.image.split(';base64,').pop();
        const imageData = Buffer.from(base64Data, 'base64');
        const outputPath = path.join(userDir, `${index + 1}.png`);

        sharp(imageData)
          .toFormat('png')
          .toFile(outputPath)
          .then(() => console.log(`Image saved to ${outputPath}`))
          .catch(err => console.error('Error converting/saving image:', err));
      });
    });
  });
}


app.get("/fetch-and-save-user-images/:userId", (req, res) => {
  const userId = req.params.userId;
  fetchUserImagesAndSave(userId);
  res.send(`Initiated fetch and save process for user ${userId}`);
});

app.get("/labels", (req, res) => {
  const labelsDir = path.join(__dirname, "labels"); // Adjust based on your actual path
  fs.readdir(labelsDir, { withFileTypes: true }, (err, files) => {
      if (err) {
          console.error("Error reading labels directory:", err);
          res.status(500).send("Error reading labels directory");
          return;
      }
      const labels = files.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
      res.json(labels);
  });
});
