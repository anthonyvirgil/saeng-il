const express = require('express');
const app = express();
const moment = require('moment');
const exphbs  = require('express-handlebars');
const cors = require('cors');
const pool = require('./db');
const path = require('path');
const { title } = require('process');

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Handlebars Middleware
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

// app.use(express.static(path.join(__dirname, 'public')));

// Root homepage
app.get('/', (req, res) => {
  res.render('index');
});

// Search form submission
app.get("/search", async (req, res) => {
  let birthdays = [];
  searchQuery = req.query.q;
  if (searchQuery.length !== 0 && searchQuery !== null && searchQuery !== '') {
    try {
      searchQueryString = sanitizeSearchQuery(searchQuery.toString());
      const idol = await pool.query("SELECT * FROM idols WHERE stage_name LIKE $1 OR birth_name LIKE $1 OR group_name LIKE $1", [`%${searchQueryString}%`]);
      if (idol.rows.length > 0) {
        idol.rows.forEach(row => {
          if (row.birthday) {
            let birthdate = moment(row.birthday);
            let today = moment();
            let age = today.diff(birthdate, 'years');
            row['birthday_string'] = birthdate.format('MMMM D, YYYY');
            row['age'] = age;
            row['korean_age'] = moment().year() - birthdate.year() + 1;
          }
          row['stage_name'] = titleize(row['stage_name']);
          row['birth_name'] = titleize(row['birth_name']);
          row['group_name'] = row['group_name'].toUpperCase();
        });
        res.render('results', {
          search_query: searchQuery,
          idols: idol.rows
        });
        return;
      }
    } catch (error) {
      console.error(error.message);
    } 
  }

  res.render('index', {
    search_query: searchQuery,
    error_message: 'Cannot find any results'
  });
  return;
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

function sanitizeSearchQuery(searchQuery) {
  let sanitized = searchQuery.toLowerCase();
  sanitized = sanitized.replace(/([\-])/g, "");  
  return sanitized;
}

function titleize(sentence) {
  if(!sentence || !sentence.split) return sentence;
  var _titleizeWord = function(string) {
          return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
      },
      result = [];
  sentence.split(" ").forEach(function(w) {
      result.push(_titleizeWord(w));
  });
  return result.join(" ");
}