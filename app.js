const express = require('express');
const app = express();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PORT = process.env.PORT || 6969;
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const cors = require('cors');
const privateKey = fs.readFileSync('/etc/letsencrypt/live/sevario.xyz/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/sevario.xyz/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/sevario.xyz/chain.pem', 'utf8');


const credentials = { key: privateKey, cert: certificate, ca: ca };

app.use(express.static('public')); // For serving static files
app.use(express.json()); // For parsing application/json
app.use(cors()); // For allowing cross-origin requests

//GET SPECIFIC SKILL FROM USER
app.get('/api/skill/:skillName/:userId', async (req, res) => {
  const skillName = req.params.skillName;
  const userId = req.params.userId;

  try {
    const result = await prisma.user_skills.findFirst({
      where: {
        user_id: userId,
        skills: {
          skill_name: skillName,
        },
      },
      include: {
        skills: true,
      },
    });

    if (!result) {
      res.status(404).json({ error: `No ${skillName} skill found for the specified user` });
      return;
    }
    res.json({
      skill_id: result.skills.skill_id,
      skill_name: result.skills.skill_name,
      description: result.skills.description,
      level: result.level,
      current_xp: result.current_xp,
    });
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ error: 'An error occurred while fetching data from the database' });
  }
});
//GET ALL SKILLS FROM USER
app.get('/api/skills/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const result = await prisma.user_skills.findMany({
      where: {
        user_id: userId,
      },
      include: {
        skills: true,
      },
    });

    if (!result) {
      res.status(404).json({ error: `No skills found for the specified user` });
      return;
    }
    res.json({result});
    
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ error: 'An error occurred while fetching data from the database' });
  }
});

//GET ALL SKILLS
app.get('/api/skills/', async (req, res) => {
  const skillName = req.params.skillName;
  const userId = req.params.userId;

  try {
    const result = await prisma.skills.findMany({
    });

    if (!result) {
      res.status(404).json({ error: `No ${skillName} skill found for the specified user` });
      return;
    }
    res.json({result});
    
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ error: 'An error occurred while fetching data from the database' });
  }
});


const httpsServerAPI = https.createServer(credentials, app);
httpsServerAPI.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} (API)`);
});

//WEBSOCKET SHIT

const httpsServer = https.createServer(credentials, (req, res) => {
  res.writeHead(200);
  res.end('Secure WebSocket server is running!\n');
});

const wss = new WebSocket.Server({ server: httpsServer });

wss.on('connection', (ws) => {
  console.log('Client connected');

  let intervalId;
  let counter = 0;


  //Control center
  const updateXP = async (clientData) => {
    const { name, xpAmount } = clientData;
  
    try {
      // Get the skill_id from the skills table using the skill_name received from the client
      const skill = await prisma.skills.findFirst({
        where: { skill_name: name },
      });
  
      // Check if the skill exists
      if (!skill) {
        console.error(`Skill '${name}' not found.`);
        return;
      }
  
      // Update the user_skills table with the dynamic xpAmount received from the client
      const current_xp = await prisma.user_skills.update({
        where: { user_id_skill_id: { user_id: 'clfo3lrcl0000uarwkn5g4img', skill_id: skill.skill_id } },
        data: { current_xp: { increment: parseInt(xpAmount) } },
      });
      counter++;
      console.log('Function running: ' + counter);
    } catch (error) {
      console.error('Error updating user skill xp:', error);
    }
  };

  // intervalId = setInterval(serverFunction, 1000); // Run the function every 1000 ms (1 second)

  ws.on('message', (message) => {
    // updateXP(JSON.parse(message));
    console.log(`Received message: ${message}`);
    result = message;
    ws.send(''+result);
    // handleMessage(ws, message);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if(intervalId) {
      clearInterval(intervalId);
    }
  });
});

const port = 8443; // You can use any port you prefer
httpsServer.listen(port, () => {
  console.log(`Secure WebSocket server is listening on port ${port} (Websocket)`);
});