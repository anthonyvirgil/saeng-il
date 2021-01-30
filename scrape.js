const request = require('request');
const cheerio = require('cheerio');
const pool = require('./db');
const { toSnakeCase, sanitizeBirthday, sanitizeRomanizedName, parseTranslatedName, test } = require('./utils/string_utils');
const moment = require('moment');

// member profile hash keys
const GROUP_MEMBER_NAME = 'group_member_name';
const STAGE_NAME = 'stage_name';
const STAGE_NAME_KR = 'stage_name_kr';
const BIRTH_NAME = 'birth_name';
const BIRTH_NAME_KR = 'birth_name_kr';
const ENGLISH_NAME = 'english_name';
const ENGLISH_NAME_KR = 'english_name_kr';
const BIRTHDAY = 'birthday';

// URLs to scrape
const girlGroupUrl = 'https://kprofiles.com/k-pop-girl-groups/';
const girlGroupDisbandedUrl = 'https://kprofiles.com/disbanded-kpop-groups-list/';
const boyGroupUrl = 'https://kprofiles.com/k-pop-boy-groups/';
const boyGroupDisbandedUrl = 'https://kprofiles.com/disbanded-kpop-boy-groups/';

const coEdGroupUrl = 'https://kprofiles.com/co-ed-groups-profiles/';
const duoGroupUrl = 'https://kprofiles.com/kpop-duets-profiles/'
const soloistUrl = 'https://kprofiles.com/kpop-solo-singers/';

const actressesUrl = 'https://kprofiles.com/korean-actresses-profiles/';
const actorsUrl = 'https://kprofiles.com/korean-actors-list/'; 

// Boy & girl groups
// scrapeGroupUrls(girlGroupUrl, false);
// scrapeGroupUrls(girlGroupDisbandedUrl, false);
// scrapeGroupUrls(boyGroupUrl, false);
// scrapeGroupUrls(boyGroupDisbandedUrl, false);

// Co-ed, duos, solo
// scrapeGroupUrls(coEdGroupUrl, false);
// scrapeGroupUrls(duoGroupUrl, false);
// scrapeGroupUrls(soloistUrl, true);

// Actors, actresses
// scrapeGroupUrls(actorsUrl, true);
// scrapeGroupUrls(actressesUrl, true);

// DEBUG FUNCTIONS
// scrapeUrl('https://kprofiles.com/sistar-members-profile/','SISTAR', false);
// scrapeUrl('https://kprofiles.com/fromis_9-members-profile/','FROMIS_9', false);
// testRetrieveFromDB();
// scrapeUrl('https://kprofiles.com/song-hye-kyo-profile-facts/', '', true);
// scrapeUrl('https://kprofiles.com/dean-profile/', 'TEST', true);

function scrapeGroupUrls(url, isActor) {
  request(url, (error, response, html) => {
    if (!error && response.statusCode == 200) {
      const $ = cheerio.load(html);
      const girlGroupLinks = $('p').find('a');
      girlGroupLinks.each((index, el) => {
        const groupName = $(el).text().trim();
        const groupLink = $(el).attr('href');
        if (groupLink.indexOf('-profile') !== -1 || groupLink.indexOf('-facts') !== -1) {
          // console.log(`${groupName} - ${groupLink}`);
          setTimeout(() => { scrapeUrl(groupLink, groupName, isActor) }, 9000);
        }
      });
    }
  });
}

function scrapeUrl(url, groupName, isActor) {
  request(url, (error, response, html) => {
    let memberProfiles = [];
    if (!error && response.statusCode == 200) {
      const $ = cheerio.load(html);
      memberProfiles = scrapeMemberProfiles($, isActor);
      console.log(groupName);
      memberProfiles.forEach(memberData => {
        if ("birthday" in memberData) {
          if (isActor) {
            memberData['group_name'] = '';
            if (!memberData['birth_name']) {
              memberData['birth_name'] = groupName.toLowerCase();
              memberData['birth_name_kr'] = memberData['stage_name_kr'];
            }
          } else {
            if (!memberData['stage_name'] && memberData['birth_name']) {
              memberData['stage_name'] =  sanitizeRomanizedName(memberData['birth_name']);
              memberData['stage_name_kr'] =  memberData['birth_name_kr'];
            }
            if (!memberData['birth_name']) {
              memberData['birth_name'] =  sanitizeRomanizedName(memberData['stage_name']);
              memberData['birth_name_kr'] =  memberData['stage_name_kr'];
            }
            memberData['group_name'] = groupName.toLowerCase();
          }
          // console.log(memberData);
          insertIntoDB(memberData);
        }
      });
    }
  });
}

function scrapeMemberProfiles($, isActor) {
  const memberSections = $('p:contains("Name")');
  let scrapedProfiles = [];
  let memberProfiles = [];
  let imgSrc = null;

  memberSections.each((index, el) => {
    const memberSection = $(el);
    let profile = memberSection.text();
    if (isActor) {
      imgSrc = $('p:contains("Profile")').find('img').attr('src');
    } else {
      imgSrc = memberSection.find('img').attr('src');
    }

    if (memberSections.length > 1 && index === 0) {
      profile = profile.substring(profile.indexOf('\n')+1);
    }
    let profileArray = profile.split('\n');
    profileArray = profileArray.filter((el) => {
      return el !== null && el !== '';
    });
    profileArray.push(`image: ${imgSrc}`);
    scrapedProfiles.push(profileArray);
  });

  scrapedProfiles.forEach((profileArray) => {
    memberProfiles.push(createProfileHash(profileArray));
  });

  return memberProfiles;
}

function createProfileHash(profileArray) {
  let profileHash = {};
  let factName = '';
  let factValue = '';

  for(let i = 0;i < profileArray.length;i++) {
    let profileFact = profileArray[i].replace(/\u00a0/g, " "); // remove &nbsp from text
    if (profileFact.indexOf('image') !== -1) {
      factName = 'image_src';
      factValue = profileFact.replace("image: ",'');
    } else if (profileFact.indexOf(':') !== -1) {
      factName = toSnakeCase(profileFact.split(':')[0]).trim();
      factValue = profileFact.split(':')[1].trim();
    } else {
      factName = GROUP_MEMBER_NAME;
      factValue = profileFact.trim();
    }

    let translatedNames = parseTranslatedName(factValue);
    if (factName === 'stage_name' || factName === 'name') {
      profileHash[STAGE_NAME] = translatedNames[0].toLowerCase();
      profileHash[STAGE_NAME_KR] = translatedNames[1];
    } else if (factName === 'birth_name' || factName === 'korean_name' || factName == 'full_name' || factName == 'birthname' || factName == 'english_name') {
      profileHash[BIRTH_NAME] = translatedNames[0].toLowerCase();
      profileHash[BIRTH_NAME_KR] = translatedNames[1];
    } else if (factName === 'english_name') {
      profileHash[ENGLISH_NAME] = translatedNames[0].toLowerCase();
      profileHash[ENGLISH_NAME_KR] = translatedNames[1];
    } else if (factName === 'birthday' || factName === 'birth_date' || factName === 'date_of_birth' || factName === 'birthdate') {
      profileHash[BIRTHDAY] = sanitizeBirthday(factValue);
    } else {
      profileHash[factName] = factValue.toLowerCase();
    }
  }
  return profileHash;
}

// DB actions
async function insertIntoDB(memberData) {
  const existingIdol = await pool.query(`SELECT * FROM idols WHERE stage_name = $1 AND group_name = $2 AND birthday = $3`, [memberData['stage_name'], memberData['group_name'], memberData['birthday']]);
  if (existingIdol.rows.length === 0) {
    const newIdol = pool.query("INSERT INTO idols (stage_name, stage_name_kr, birth_name, birth_name_kr, birthday, group_name, image_src) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [memberData['stage_name'], memberData['stage_name_kr'], memberData['birth_name'], memberData['birth_name_kr'], memberData['birthday'], memberData['group_name'], memberData['image_src']],
      (error, results) => {
        if (error) {
          console.error(error.message);
        }
      }
    );
  } else {
    // Update photo
    if (memberData['image_src']) {
      rowId = existingIdol.rows[0]['_id'];
      const updateIdol = await pool.query(`UPDATE idols SET image_src = $1 WHERE _id = $2`, [memberData['image_src'], rowId]);
    }

    // Update birthday
    if (memberData['birthday']) {
      rowId = existingIdol.rows[0]['_id'];
      const updateIdol = await pool.query(`UPDATE idols SET birthday = $1 WHERE _id = $2`, [memberData['birthday'], rowId]);
    }
  }
}