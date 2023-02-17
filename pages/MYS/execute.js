const userId = "203029070693269504";
const token = '%DISCORD_TOKEN%';

fetch(`https://discord.com/api/users/${userId}`, {
  headers: {
    Authorization: `Bot ${token}`
  }
})
  .then(response => response.json())
  .then(data => {
    console.log(`The username for user ${userId} is ${data.username}#${data.discriminator}`);
  })
  .catch(error => {
    console.error(`Error fetching user information for user ${userId}: ${error}`);
  });
