# mysql table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(100)
);

# npm start to start server,
application will run at port 8000
the running port is configured in .env file

# APIs
(get,post) -- /users
(get) ------- /users/:id
(post) ------ /login
(get) ------- /user (fetching user from token)

bcrypt for password hashing

# token authorisation
used autenticate token middleware for token authorisation/protected routes
concept of refresh token
get user data from token