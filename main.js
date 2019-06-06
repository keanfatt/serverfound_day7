//SQL statements
const SQL_SELECT_FILM = 'select film_id, title, description from film limit 20';
const SQL_SELECT_FILM_WHERE = 'select film_id, title, description from film where title like ?';
const SQL_SELECT_FILM_PAGE = 'select film_id, title, description from film limit ? offset ?';
const SQL_SELECT_FILM_WHERE_PAGE = 
    'select film_id, title, description from film where title like ? limit ? offset ?';
const SQL_COUNT_FILM = 'select count(*) as film_count from film where title like ?';
const SQL_SELECT_FILM_CAT="SELECT category_id, name FROM category";


const SQL_SELECT_FILM_ID_PAGE = 
    'select film.film_id, title, description from film,film_category where film.title like ? AND film.film_id=film_category.film_id AND film_category.category_id=? limit ? offset ?';


//Load the libraries
const express = require('express');
const hbs = require('express-handlebars');
const mysql = require('mysql');

//Configure PORT
const PORT = parseInt(process.argv[2] || process.env.APP_PORT || 3000);

//Create an MySQL connection pool
const pool = mysql.createPool(require('./config.json'));

//Promises
const mkQuery = (sql, pool) => {
    return ((params) => {
        const p = new Promise((resolve, reject) => {
            pool.getConnection((err, conn) => {
                if (err)
                    return reject(err);
                conn.query(sql, params || [], (err, result) => {
                    conn.release()
                    if (err)
                        return reject(err);
                    resolve(result);
                })
            })
        })
        return (p);
    });
}

const selectFilm = mkQuery(SQL_SELECT_FILM_WHERE_PAGE, pool);
const countFilm = mkQuery(SQL_COUNT_FILM, pool);
const selectCat = mkQuery(SQL_SELECT_FILM_CAT, pool);
const selectFilmID = mkQuery(SQL_SELECT_FILM_ID_PAGE, pool);

//Create an instance of the application
const app = express();

//Configure handlebars
app.engine('hbs', hbs({ defaultLayout: 'main.hbs' }));

//app.engine('hbs', hbs());
app.set('view engine', 'hbs');
//This is optional because views is the default directory
app.set('views', __dirname + '/views');

//Routes
app.get('/filmsearch', (req, resp) => {
    Promise.all([ selectCat([]) ])
    .then(result => {
        console.log("cat: ",result[0]);
        resp.status(200);
        resp.type('text/html');
        resp.render('filmsearch', { 
            categories: result[0],
            layout: false 
        });
    })
    .catch(err => {
        console.error('err: ', err)
        resp.status(500);
        resp.type('text/plain');
        resp.send(err);
    })
})



app.get('/search', (req, resp) => {
    const q = req.query.q;    
    const cat = req.query.genre;

    //Checkout a connection from the pool
//    Promise.all([ selectFilm([ `%${q}%`, 10, 0 ]), countFilm([ `%${q}%` ]) ])
    Promise.all([ selectFilmID([ `%${q}%`, cat, 10, 0 ]), countFilm([ `%${q}%` ]) ])
    .then(result => {
        const data = result[0];
        const count = result[1];
        resp.status(200);
        resp.type('text/html');
        resp.render('films', { 
            films: data,
            noResult: data.length <= 0, 
            q: q,
            count: count[0].film_count,
            layout: false 
        });
    })
    .catch(err => {
        console.error('err: ', err)
        resp.status(500);
        resp.type('text/plain');
        resp.send(err);
    })
});

app.get(/.*/, express.static(__dirname + '/public'))

//Error
app.use((req, resp) =>{
    resp.status(404);
    resp.type('text/html');
    resp.sendFile(__dirname + '/public/404.html');
    
    })

app.listen(PORT, () => {
    console.info(`Application started on port ${PORT} at ${new Date()}`);
});