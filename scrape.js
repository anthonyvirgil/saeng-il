const request = require('request');
const cheerio = require('cheerio');

// member profile hash keys
const GROUP_MEMBER_NAME = 'group_member_name';
const STAGE_NAME = 'stage_name';
const STAGE_NAME_KR = 'stage_name_kr';
const BIRTH_NAME = 'birth_name';
const BIRTH_NAME_KR = 'birth_name_kr';
const ENGLISH_NAME = 'english_name';
const ENGLISH_NAME_KR = 'english_name_kr';
const BIRTHDAY = 'birthday';

// TODO: iterate through all groupURLs
// groupUrl = 'https://kprofiles.com/gfriend-profile/';
groupUrl = 'https://kprofiles.com/bts-bangtan-boys-members-profile/';
// groupUrl = 'https://kprofiles.com/red-velvet-members-profile/';
// groupUrl = 'https://kprofiles.com/got7-members-profile/';
// groupUrl = 'https://kprofiles.com/dean-profile/';

request(groupUrl, (error, response, html) => {
  if (!error && response.statusCode == 200) {
    const $ = cheerio.load(html);
    const memberProfiles = scrapeMemberProfiles($);
    console.log(memberProfiles);
  }
});

function scrapeMemberProfiles($) {
  const memberSections = $('p:contains("Stage Name:")');
  let scrapedProfiles = [];
  let memberProfiles = [];

  memberSections.each((index, el) => {
    const memberSection = $(el);
    let profile = memberSection.text();

    if (memberSections.length > 1 && index === 0) {
      profile = profile.substring(profile.indexOf('\n')+1);
    }
    
    let profileArray = profile.split('\n');
    profileArray = profileArray.filter((el) => {
      return el !== null && el !== '';
    });
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

    if (profileArray[i].indexOf(':') !== -1) {
      factName = toSnakeCase(profileArray[i].split(':')[0]).trim();
      factValue = profileArray[i].split(':')[1].trim();
    } else {
      factName = GROUP_MEMBER_NAME;
      factValue = profileArray[i].trim();
    }

    let translatedNames = parseTranslatedName(factValue);
    if (factName === 'stage_name') {
      profileHash[STAGE_NAME] = translatedNames[0];
      profileHash[STAGE_NAME_KR] = translatedNames[1];
    } else if (factName === 'birth_name' || factName === 'korean_name' || factName == 'full_name') {
      profileHash[BIRTH_NAME] = translatedNames[0];
      profileHash[BIRTH_NAME_KR] = translatedNames[1];
    } else if (factName === 'english_name') {
      profileHash[ENGLISH_NAME] = translatedNames[0];
      profileHash[ENGLISH_NAME_KR] = translatedNames[1];
    } else {
      profileHash[factName] = factValue;
    }
  }
  return profileHash;
}

function toSnakeCase(str) {
  return str.replace(/[^a-zA-Z0-9 ]/g, "").replace(/([\-]|[\ ])/g,'_').toLowerCase();
}

function parseTranslatedName(factValue) {
  let romanizedName = '';
  let hangulName = '';
  if (factValue.indexOf('(') !== -1) {
    hangulName = factValue.split('(')[1].replace(/([\(]|[\)])/g,'').trim();
    romanizedName = factValue.split('(')[0].trim();
  } else {
    romanizedName = factValue;
  }
  return [romanizedName, hangulName];
}