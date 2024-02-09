// Define the base URL of your backend server

const baseUrl = 'http://localhost:5000';

document.getElementById('beerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('beerId').value;
    const image = document.getElementById('dataurl').value;

    const method = id ? 'PUT' : 'POST';
    // Use the baseUrl variable here
    const url = `${baseUrl}${id ? `/${id}` : ''}`;

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, image }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Success:', data);
        alert(data.message);
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('Failed to process the request');
    });
});
