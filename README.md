#mysql table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(100)
);

#npm start to start server,
application will run at port 8000

#APIs
(get,post)localhost:8000/users
(get)localhost:8000/users/:id
