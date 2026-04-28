const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};
let bets = [];
let jackpot = 1000000;

io.on("connection", (socket) => {
  players[socket.id] = { money: 100000 };

  // ===== TÀI XỈU
  socket.on("bet_taixiu", ({choice, amount}) => {
    if (players[socket.id].money >= amount) {
      players[socket.id].money -= amount;
      bets.push({ id: socket.id, choice, amount });
    }
  });

  // ===== SLOT
  socket.on("slot", (amount) => {
    let items = ["🍒","🍋","🔔","💎","7️⃣"];
    let r = [
      items[Math.floor(Math.random()*5)],
      items[Math.floor(Math.random()*5)],
      items[Math.floor(Math.random()*5)]
    ];

    let reward = 0;
    if (r[0]===r[1]&&r[1]===r[2]) reward = amount*5;
    else if (r[0]===r[1]||r[1]===r[2]||r[0]===r[2]) reward = amount*2;

    players[socket.id].money += reward;
    socket.emit("slot_result",{result:r,reward});
  });

  // ===== ĐOÁN SỐ
  socket.on("guess_number", ({number, amount}) => {
    let lucky = Math.floor(Math.random()*10)+1;
    if(number===lucky) players[socket.id].money += amount*3;
    socket.emit("guess_result",{lucky});
  });

  // ===== LẺ CHẴN
  socket.on("even_odd", ({choice, amount}) => {
    let num = Math.floor(Math.random()*100)+1;
    let result = num%2===0?"even":"odd";
    if(choice===result) players[socket.id].money += amount*2;
    socket.emit("even_odd_result",{num,result});
  });

  // ===== HIGH LOW
  socket.on("high_low", ({choice, amount}) => {
    let num = Math.floor(Math.random()*100)+1;
    let result = num>50?"high":"low";
    if(choice===result) players[socket.id].money += amount*2;
    socket.emit("hl_result",{num,result});
  });

  // ===== BOX
  socket.on("box", (amount) => {
    let rewards=[0,amount*2,amount*3,amount*5];
    let r=rewards[Math.floor(Math.random()*4)];
    players[socket.id].money += r;
    socket.emit("box_result",r);
  });

  // ===== SPIN
  socket.on("spin", () => {
    let r=[0,50,100,-50][Math.floor(Math.random()*4)];
    players[socket.id].money += r;
    socket.emit("spin_result",r);
  });

  socket.on("disconnect", () => delete players[socket.id]);
});

// ===== TÀI XỈU LOOP + JACKPOT
setInterval(()=>{
  let dice=[1,1,1].map(()=>Math.floor(Math.random()*6)+1);
  let total=dice.reduce((a,b)=>a+b,0);
  let result=total>=11?"tai":"xiu";
  let isJackpot=false;

  bets.forEach(b=>{
    if(!players[b.id]) return;

    jackpot += Math.floor(b.amount*0.05);

    if(b.choice===result){
      players[b.id].money += b.amount*2;

      if((total===3||total===18)&&Math.random()<0.01){
        players[b.id].money += jackpot;
        jackpot=500000;
        isJackpot=true;
      }
    }
  });

  io.emit("taixiu_result",{dice,total,result,jackpot,players,isJackpot});
  bets=[];

},8000);

// ===== AVIATOR
function aviator(){
  let m=1;
  let int=setInterval(()=>{
    m+=0.1;
    io.emit("aviator_update",m.toFixed(2));
    if(Math.random()<0.05){
      clearInterval(int);
      io.emit("aviator_crash",m.toFixed(2));
      setTimeout(aviator,3000);
    }
  },200);
}
aviator();

const PORT = process.env.PORT || 3000;
server.listen(PORT);
