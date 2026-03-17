const axios = require('axios');

module.exports = async (accessToken) => {
  const url = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`;
  const { data } = await axios.get(url);
  return data;
};
