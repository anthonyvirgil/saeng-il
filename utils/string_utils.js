 exports.toSnakeCase = (str) => {
  return str.replace(/[^a-zA-Z0-9 ]/g, "").replace(/([\-]|[\ ])/g,'_').toLowerCase();
}

exports.sanitizeBirthday = (factValue) => {
  let birthdayString = factValue.replace(/(\d+)(st|nd|rd|th)/g,"$1");
  birthdayString = birthdayString.replace(/([,])/g,'').trim();
  if (!isNaN(Date.parse(birthdayString))) {
    return new Date(birthdayString);
  } else {
    return null;
  }
}

exports.sanitizeRomanizedName = (name) => {
  if (name) {
    let sanitizedName = name.replace(/([\-])/g,' ');
    let syllables = sanitizedName.split(' ');
    if (syllables.length > 2) {
      return `${syllables[0]} ${syllables[1]}${syllables[2]}`;
    } else {
      return sanitizedName;
    }
  } else {
    return null;
  }
}

exports.parseTranslatedName = (factValue) => {
  let romanizedName = '';
  let hangulName = '';
  if (factValue.indexOf('(') !== -1) {
    hangulName = factValue.split('(')[1].replace(/([\(]|[\)])/g,'')
    romanizedName = factValue.split('(')[0];
  } else {
    romanizedName = factValue;
  }
  return [romanizedName.trim(), hangulName.trim()];
}