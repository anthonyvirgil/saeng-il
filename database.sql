CREATE DATABASE hallyu;

CREATE TABLE idols(
  _id SERIAL PRIMARY KEY,
  stage_name VARCHAR(255),
  stage_name_kr VARCHAR(255),
  birth_name VARCHAR(255),
  birth_name_kr VARCHAR(255),
  birthday TIMESTAMP,
  group_name VARCHAR(255),
  image_src VARCHAR(255),
  is_solo BOOLEAN NOT NULL DEFAULT FALSE;
);

UPDATE idols SET group_name = 'blackpink' WHERE group_name = 'black pink';
UPDATE idols SET group_name = 'bts' WHERE group_name = 'bts (bangtan boys)';
update idols set group_name = $$girls' generation$$ where group_name like '%girls’ generation%';
