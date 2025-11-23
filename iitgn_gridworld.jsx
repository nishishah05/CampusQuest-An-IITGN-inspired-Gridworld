import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Edit, Plus, Trash2, MapPin, X, Brain, Activity, Zap } from 'lucide-react'; 

// Import the retro font
const FONT_IMPORT = (
  <link
    href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
    rel="stylesheet"
  />
);

// --- INITIAL CONFIGURATION DATA ---
const INITIAL_GRID_H = 7;
const INITIAL_GRID_W = 9;
const START_POS = { r: 6, c: 0 };
const CELL_SIZE = 64;

// Background Image - ENSURE REPO IS PUBLIC
//const BG_IMAGE = 'https://raw.githubusercontent.com/nishishah05/CampusQuest-An-IITGN-inspired-Gridworld/main/LalMinar.png';
const BG_IMAGE = 'https://raw.githubusercontent.com/nishishah05/CampusQuest-An-IITGN-inspired-Gridworld/main/lal_minar_and_classrooms.jpg';

const IMG = {
  ijokha: '🏠',
  teapost: '☕',
  atul: '🥐',
  friend: '👋',
  library: '📚',
  dogs: '🐕',
  ab10: '🏛️',
  workspace: '💻', 
  lab2d: '🍵',
  wall: '🧱',
};

const getInitialLandmarks = () => ({
  'Ijokha Hostel': { r: 6, c: 0, reward: 0, emoji: IMG.ijokha, isTarget: false, isStart: true },
  'Tea Post': { r: 5, c: 2, reward: -0.5, emoji: IMG.teapost, isTarget: false, isStart: false },
  'Atul Bakery': { r: 4, c: 4, reward: -0.2, emoji: IMG.atul, isTarget: false, isStart: false },
  'Friend Meet': { r: 3, c: 1, reward: -1.0, emoji: IMG.friend, isTarget: false, isStart: false },
  Library: { r: 2, c: 5, reward: 0.5, emoji: IMG.library, isTarget: false, isStart: false },
  Dogs: { r: 0, c: 3, reward: -0.1, emoji: IMG.dogs, isTarget: false, isStart: false },
  'Workspace': { r: 3, c: 3, reward: 2.0, emoji: IMG.workspace, isTarget: false, isStart: false },
  '2D': { r: 1, c: 5, reward: -2.0, emoji: IMG.lab2d, isTarget: false, isStart: false },
  AB10: { r: 0, c: 8, reward: 500, emoji: IMG.ab10, isTarget: true, isStart: false }, 
});

const INITIAL_WALLS = [{ r: 5, c: 4 }, { r: 4, c: 2 }, { r: 1, c: 6 }];
const ACTIONS = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

// --- HELPER FUNCTIONS ---

const isWall = (r, c, walls) => walls.some(w => w.r === r && w.c === c);
const landmarkAt = (r, c, landmarks) => {
  for (const [name, obj] of Object.entries(landmarks)) {
    if (obj.r === r && obj.c === c) return { name, ...obj };
  }
  return null;
};

const moveAgent = (pos, action, walls, GRID_H, GRID_W) => {
  let { r, c } = pos;
  if (action === 'UP') r--;
  if (action === 'RIGHT') c++;
  if (action === 'DOWN') r++;
  if (action === 'LEFT') c--;
  if (r < 0 || r >= GRID_H || c < 0 || c >= GRID_W) return pos;
  if (isWall(r, c, walls)) return pos;
  return { r, c };
};

// --- ALGORITHM HELPERS ---

// Standard Q-Table Initialization
const initQTable = (GRID_H, GRID_W) => {
  const Q = {};
  for (let r = 0; r < GRID_H; r++) {
    for (let c = 0; c < GRID_W; c++) {
      Q[`${r},${c}`] = { UP: 0, RIGHT: 0, DOWN: 0, LEFT: 0 };
    }
  }
  return Q;
};

// DQN Approximation: Linear Function Approximation (Weights)
// Q(s, a) ≈ w1*r + w2*c + bias
const initDQNWeights = () => {
  const weights = {};
  ACTIONS.forEach(a => {
    weights[a] = { wR: Math.random() * 0.1, wC: Math.random() * 0.1, wBias: 0 };
  });
  return weights;
};

const getDQNValue = (r, c, action, weights) => {
    // Normalize inputs 
    const nr = r / 10;
    const nc = c / 10;
    const w = weights[action];
    return (w.wR * nr) + (w.wC * nc) + w.wBias;
};

export default function App() {
  const [GRID_H, setGridH] = useState(INITIAL_GRID_H);
  const [GRID_W, setGridW] = useState(INITIAL_GRID_W);
  const [landmarks, setLandmarks] = useState(getInitialLandmarks());
  const [walls, setWalls] = useState(INITIAL_WALLS);
  const [editing, setEditing] = useState(false); 

  const [agent, setAgent] = useState(START_POS);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [trainingMode, setTrainingMode] = useState(null); 

  const [Qtable, setQtable] = useState(initQTable(INITIAL_GRID_H, INITIAL_GRID_W));
  const [DQNWeights, setDQNWeights] = useState(initDQNWeights());

  const [learnedPath, setLearnedPath] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [particles, setParticles] = useState([]);
  const [showVictory, setShowVictory] = useState(false); 

  const currentManual = useRef([]);
  const trainingRef = useRef(false);
  const audioContextRef = useRef(null);

  const [newLmName, setNewLmName] = useState('New Stop');
  const [newLmEmoji, setNewLmEmoji] = useState('⭐');
  const [newLmR, setNewLmR] = useState(0);
  const [newLmC, setNewLmC] = useState(0);
  const [newLmReward, setNewLmReward] = useState(0.0);
  
  const startLm = Object.entries(landmarks).find(([_, obj]) => obj.isStart);
  const startName = startLm ? startLm[0] : 'Start';

  // --- RESET & INIT ---
  const resetAll = () => {
    const currentStartLm = Object.values(landmarks).find(lm => lm.isStart);
    const startR = currentStartLm ? currentStartLm.r : START_POS.r;
    const startC = currentStartLm ? currentStartLm.c : START_POS.c;
    
    setAgent({r: startR, c: startC});
    setLearnedPath([]);
    setLog([]);
    setRunning(false);
    setEpisodes([]);
    setQtable(initQTable(GRID_H, GRID_W));
    setDQNWeights(initDQNWeights());
    setShowVictory(false);
    setTrainingMode(null);
    playSound(330, 0.1);
    addLog('System Reset. Memory cleared.');
  };
  
  useEffect(() => {
    setQtable(initQTable(GRID_H, GRID_W));
  }, [GRID_H, GRID_W]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => 
        prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.2, life: p.life - 0.02 })).filter(p => p.life > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // --- SOUNDS ---
  const playSound = (frequency, duration, type = 'sine', volume = 0.1) => {
    if (!soundEnabled || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  };
  const playPositiveSound = () => { playSound(600, 0.1, 'triangle'); playSound(800, 0.1, 'triangle'); };
  const playBonusSound = () => { 
    if (!soundEnabled || !audioContextRef.current) return;
    const ctx = audioContextRef.current; const now = ctx.currentTime;
    const playNote = (freq, time) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(0.1, time); gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc.start(time); osc.stop(time + 0.3);
    };
    playNote(523.25, now); playNote(659.25, now + 0.1); playNote(783.99, now + 0.2); 
  };
  const playNegativeSound = () => { playSound(150, 0.15, 'sawtooth'); playSound(100, 0.15, 'sawtooth'); };
  const playFanfare = () => {
    if (!soundEnabled || !audioContextRef.current) return;
    const ctx = audioContextRef.current; const now = ctx.currentTime;
    const playTone = (freq, time, dur) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square'; osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.1, time); gain.gain.linearRampToValueAtTime(0, time + dur);
        osc.start(time); osc.stop(time + dur);
    };
    playTone(523.25, now, 0.15); playTone(523.25, now + 0.15, 0.15); playTone(523.25, now + 0.30, 0.15); playTone(783.99, now + 0.45, 0.6); playTone(1046.5, now + 0.45, 0.6); 
  };

  // --- PARTICLES ---
  const createParticles = (r, c, color, count = 8) => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i, x: c * CELL_SIZE + CELL_SIZE / 2, y: r * CELL_SIZE + CELL_SIZE / 2,
      vx: (Math.random() - 0.5) * 8, vy: (Math.random() * -5) - 3, color, life: 1
    }));
    setParticles(prev => [...prev, ...newParticles]);
  };
  const confettiColors = ['#FFD700', '#FF6B6B', '#4169E1', '#32CD32', '#FF00FF', '#00FFFF'];
  const createConfetti = (r, c, count = 30) => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i, x: c * CELL_SIZE + CELL_SIZE / 2, y: r * CELL_SIZE + CELL_SIZE / 2,
      vx: (Math.random() - 0.5) * 20, vy: (Math.random() * -15) - 5,
      color: confettiColors[i % confettiColors.length], life: 2 + Math.random()
    }));
    setParticles(prev => [...prev, ...newParticles]);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (running || editing || showVictory) return; 
      if (e.key === 'ArrowUp') handleMove('UP');
      if (e.key === 'ArrowDown') handleMove('DOWN');
      if (e.key === 'ArrowLeft') handleMove('LEFT');
      if (e.key === 'ArrowRight') handleMove('RIGHT');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [agent, running, editing, walls, landmarks, GRID_H, GRID_W, showVictory]); 

  const addLog = (s) => setLog(l => [s, ...l].slice(0, 200));

  const triggerVictory = (r, c, name) => {
    playFanfare(); createConfetti(r, c, 100); 
    addLog(`🎉 REACHED ${name}! VICTORY!`); setShowVictory(true); setRunning(false); 
  };

  const handleMove = (action) => {
    if (running || editing || showVictory) return;
    const newPos = moveAgent(agent, action, walls, GRID_H, GRID_W);
    const lm = landmarkAt(newPos.r, newPos.c, landmarks);
    currentManual.current.push({ state: { ...agent }, action, next: { ...newPos }, reward: lm ? lm.reward : -0.02 });
    playSound(200 + Math.random() * 100, 0.05, 'square');

    if (lm) {
      addLog(`${lm.emoji} ${lm.name} → ${lm.reward > 0 ? '+' : ''}${lm.reward}`);
      const targetLm = Object.entries(landmarks).find(([_, obj]) => obj.isTarget);
      if (targetLm && lm.name === targetLm[0]) {
        triggerVictory(newPos.r, newPos.c, lm.name);
        setEpisodes((e) => [...e, [...currentManual.current]]);
        currentManual.current = [];
      } else {
        if (lm.name === 'Library' || lm.name === 'Workspace') { playBonusSound(); createParticles(newPos.r, newPos.c, '#00FFFF', 8); }
        else if (lm.reward > 0) { playPositiveSound(); createParticles(newPos.r, newPos.c, '#FFD700', 6); }
        else if (lm.reward < 0) { playNegativeSound(); createParticles(newPos.r, newPos.c, '#DC143C', 6); }
      }
    }
    setAgent(newPos);
  };

  // --- 🧠 AI TRAINING LOGIC ---

  const runTraining = async (mode) => {
    if (trainingRef.current || editing) return;
    trainingRef.current = true;
    setRunning(true);
    setTrainingMode(mode);
    addLog(`🤖 Starting ${mode} Training...`);
    playSound(440, 0.2);

    // Params
    const alpha = 0.5; // Learning Rate
    const gamma = 0.99; // Discount Factor
    let epsilon = 1.0; // Exploration rate
    const epsilonDecay = 0.995;
    const epsilonMin = 0.01;
    const ITERATIONS = 2500;

    const Q = { ...Qtable }; // Clone existing
    let W = { ...DQNWeights }; // Clone weights

    const targetLm = Object.entries(landmarks).find(([_, obj]) => obj.isTarget);
    if (!targetLm) { addLog('⚠️ ERROR: No target!'); trainingRef.current = false; setRunning(false); return; }
    const targetName = targetLm[0];
    const currentStartLm = Object.values(landmarks).find(lm => lm.isStart);
    const startPos = currentStartLm ? { r: currentStartLm.r, c: currentStartLm.c } : START_POS;

    // --- Helper for Action Selection (Epsilon Greedy) ---
    const selectAction = (pos, currentQ, currentW, eps) => {
        if (Math.random() < eps) return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
        
        // Greedy
        if (mode === 'DQN') {
            return ACTIONS.reduce((a, b) => getDQNValue(pos.r, pos.c, a, currentW) > getDQNValue(pos.r, pos.c, b, currentW) ? a : b);
        } else {
            const key = `${pos.r},${pos.c}`;
            const qs = currentQ[key];
            return Object.keys(qs).reduce((a, b) => qs[a] >= qs[b] ? a : b);
        }
    };

    // --- Helper to get Max Q (for Q-Learning) ---
    const getMaxQ = (pos, currentQ, currentW) => {
        if (mode === 'DQN') {
            return Math.max(...ACTIONS.map(a => getDQNValue(pos.r, pos.c, a, currentW)));
        } else {
            const key = `${pos.r},${pos.c}`;
            return Math.max(...Object.values(currentQ[key]));
        }
    };
    
    // --- Training Loop ---
    for (let ep = 0; ep < ITERATIONS; ep++) {
        let pos = { ...startPos };
        // SARSA requires initial action
        let action = selectAction(pos, Q, W, epsilon);

        for (let step = 0; step < 500; step++) {
            // Take Action
            const newPos = moveAgent(pos, action, walls, GRID_H, GRID_W);
            const lm = landmarkAt(newPos.r, newPos.c, landmarks);
            const reward = lm ? lm.reward : -0.05;
            
            // Logic Split based on Mode
            if (mode === 'Q') {
                    // Q-Learning: Off-Policy (Update using max of next state)
                    const maxNextQ = getMaxQ(newPos, Q, W);
                    const key = `${pos.r},${pos.c}`;
                    Q[key][action] += alpha * (reward + gamma * maxNextQ - Q[key][action]);
                    
                    pos = newPos;
                    action = selectAction(pos, Q, W, epsilon); // Next action chosen fresh
            } 
            else if (mode === 'SARSA') {
                // SARSA: On-Policy (Update using actual next action)
                const nextAction = selectAction(newPos, Q, W, epsilon);
                
                const key = `${pos.r},${pos.c}`;
                const nextKey = `${newPos.r},${newPos.c}`;
                const currentVal = Q[key][action];
                const nextVal = Q[nextKey][nextAction];
                
                Q[key][action] += alpha * (reward + gamma * nextVal - currentVal);
                
                pos = newPos;
                action = nextAction;
            }
            else if (mode === 'DQN') {
                    // Approximate Q-Learning
                    const maxNextQ = getMaxQ(newPos, Q, W);
                    const currentVal = getDQNValue(pos.r, pos.c, action, W);
                    const target = reward + gamma * maxNextQ;
                    const error = target - currentVal;
                    
                    // Gradient Descent Update
                    const nr = pos.r / 10;
                    const nc = pos.c / 10;
                    
                    W[action].wR += alpha * error * nr;
                    W[action].wC += alpha * error * nc;
                    W[action].wBias += alpha * error * 1;

                    pos = newPos;
                    action = selectAction(pos, Q, W, epsilon);
            }

            if (lm && lm.name === targetName) break;
        }
        if (epsilon > epsilonMin) epsilon *= epsilonDecay;
    }

    if (mode === 'DQN') setDQNWeights(W);
    else setQtable(Q);

    addLog(`✅ ${mode} Training complete!`);
    playSound(659, 0.15);
    
    // Extract Path logic varies slightly for DQN
    const path = extractLearnedPath(mode === 'DQN' ? {type: 'W', data: W} : {type: 'Q', data: Q}, mode);
    setLearnedPath(path);
    trainingRef.current = false;
    setRunning(false);
  };

  const extractLearnedPath = (model, mode) => {
    const path = [];
    const currentStartLm = Object.values(landmarks).find(lm => lm.isStart);
    let pos = currentStartLm ? { r: currentStartLm.r, c: currentStartLm.c } : START_POS;
    const visited = new Set();
    const targetLm = Object.entries(landmarks).find(([_, obj]) => obj.isTarget);
    if (!targetLm) return [];
    const targetName = targetLm[0];

    for (let i = 0; i < 300; i++) {
      path.push({ ...pos });
      
      let bestAction;
      if (mode === 'DQN') {
          bestAction = ACTIONS.reduce((a, b) => getDQNValue(pos.r, pos.c, a, model.data) > getDQNValue(pos.r, pos.c, b, model.data) ? a : b);
      } else {
          const key = `${pos.r},${pos.c}`;
          const Qs = model.data[key];
          bestAction = Object.keys(Qs).reduce((a, b) => Qs[a] >= Qs[b] ? a : b);
      }

      const newPos = moveAgent(pos, bestAction, walls, GRID_H, GRID_W);
      const lm = landmarkAt(pos.r, pos.c, landmarks);
      if (lm && lm.name === targetName) break; 
      
      if (newPos.r === pos.r && newPos.c === pos.c) {
        let moved = false;
        for (const a of ACTIONS.sort(() => Math.random() - 0.5)) {
          const p = moveAgent(pos, a, walls, GRID_H, GRID_W);
          if (p.r !== pos.r || p.c !== pos.c) { pos = p; moved = true; break; }
        }
        if (!moved) break;
      } else { pos = newPos; }

      const nextLm = landmarkAt(pos.r, pos.c, landmarks);
      if (nextLm && nextLm.name === targetName) { path.push({ ...pos }); break; }

      const keyStr = `${pos.r},${pos.c}`;
      if (visited.has(keyStr)) break;
      visited.add(keyStr);
    }
    return path;
  };

  const playLearnedPath = async () => {
    if (running || editing) return;
    if (!trainingMode) { addLog('⚠️ Train an algorithm first!'); playNegativeSound(); return; }

    const model = trainingMode === 'DQN' ? {type: 'W', data: DQNWeights} : {type: 'Q', data: Qtable};
    const path = extractLearnedPath(model, trainingMode);
    
    if (!path || path.length <= 1) { addLog('⚠️ No path found! Train more.'); playNegativeSound(); return; }

    setLearnedPath(path); setRunning(true);
    addLog(`▶️ Playing ${trainingMode} path...`); playSound(523, 0.1);
    
    const targetLm = Object.entries(landmarks).find(([_, obj]) => obj.isTarget);
    const targetName = targetLm ? targetLm[0] : null;

    for (const step of path) {
      setAgent(step);
      const lm = landmarkAt(step.r, step.c, landmarks);
      if (lm) {
        addLog(`${lm.emoji} ${lm.name} → ${lm.reward > 0 ? '+' : ''}${lm.reward}`);
        if (lm.name === targetName) { triggerVictory(step.r, step.c, lm.name); break; }
        else if (lm.name === 'Library' || lm.name === 'Workspace') { playBonusSound(); createParticles(step.r, step.c, '#00FFFF', 8); }
        else if (lm.reward > 0) { createParticles(step.r, step.c, '#00FF00', 4); playPositiveSound(); }
        else if (lm.reward < 0) { createParticles(step.r, step.c, '#DC143C', 4); playNegativeSound(); }
      }
      await new Promise(res => setTimeout(res, 350));
    }
    if (!showVictory) { addLog('✅ Finished playing path!'); setRunning(false); }
  };
  
  // --- HANDLERS ---
  const handleRewardChange = (name, newReward) => { setLandmarks(prev => ({ ...prev, [name]: { ...prev[name], reward: parseFloat(newReward) || 0 }, })); };
  const handleCoordChange = (name, type, newValue) => {
    const val = parseInt(newValue);
    if (isNaN(val) || val < 0 || (type === 'r' && val >= GRID_H) || (type === 'c' && val >= GRID_W)) return;
    const newR = type === 'r' ? val : landmarks[name].r;
    const newC = type === 'c' ? val : landmarks[name].c;
    const existingLm = landmarkAt(newR, newC, landmarks);
    const isOverlappingLm = existingLm && existingLm.name !== name;
    if (isOverlappingLm || isWall(newR, newC, walls)) return;
    setLandmarks(prev => { const newState = { ...prev }; newState[name] = { ...newState[name], [type]: val }; return newState; });
    if (landmarks[name].isStart) setAgent({r: newR, c: newC});
    resetAll();
  };
  const handleTargetToggle = (name) => { setLandmarks(prev => { const newState = {}; for (const [key, value] of Object.entries(prev)) { newState[key] = { ...value, isTarget: key === name ? !value.isTarget : false }; } return newState; }); };
  const handleRemoveLandmark = (name) => { if (landmarks[name].isStart) return; setLandmarks(prev => { const { [name]: _, ...rest } = prev; return rest; }); resetAll(); };
  const handleCellClick = (r, c) => {
    if (!editing) return; const lm = landmarkAt(r, c, landmarks); if (lm && lm.isStart) return;
    const wallIndex = walls.findIndex(w => w.r === r && w.c === c);
    if (wallIndex !== -1) { setWalls(prev => prev.filter((_, i) => i !== wallIndex)); resetAll(); return; }
    if (lm) { handleRemoveLandmark(lm.name); return; }
    setWalls(prev => [...prev, { r, c }]); resetAll();
  };
  const handleAddLandmark = () => {
    const name = newLmName.trim(); const r = parseInt(newLmR); const c = parseInt(newLmC); const reward = parseFloat(newLmReward);
    if (!name || name in landmarks || r < 0 || r >= GRID_H || c < 0 || c >= GRID_W || isWall(r, c, walls) || landmarkAt(r, c, landmarks)) return;
    setLandmarks(prev => ({ ...prev, [name]: { r, c, reward, emoji: newLmEmoji, isTarget: false, isStart: false } }));
    setNewLmR(0); setNewLmC(0); setNewLmReward(0.0); resetAll(); 
  };
  const pathSet = new Set((learnedPath || []).map(p => `${p.r},${p.c}`));
  const targetLm = Object.entries(landmarks).find(([_, obj]) => obj.isTarget);

  return (
    <>
      {FONT_IMPORT}
      {/* 🌟 FULL SCREEN BACKGROUND STYLES APPLIED HERE 🌟 */}
      <div style={{ 
        position: 'absolute', // Added for full coverage if React's root doesn't cover
        top: 0,
        left: 0,
        width: '100%',
        minHeight: '100vh', // Ensures it covers the full viewport height
        padding: '30px',
        fontFamily: '"Press Start 2P", "Courier New", monospace',
        //backgroundImage: `linear-gradient(rgba(245, 222, 179, 0.4), rgba(245, 222, 179, 0.4)), url('${BG_IMAGE}')`,
        backgroundImage: `url('${BG_IMAGE}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundColor: '#C19A6B' // Fallback color
      }}>
        <style>{`
          @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
          @keyframes glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
          @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 80% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
          .config-button:disabled { opacity: 0.5; cursor: not-allowed; }
          .config-button { transition: background-color 0.1s; }
          .config-button:not(:disabled):hover { filter: brightness(1.2); }
          
          /* Ensures body/html utilize full space if needed, though usually handled by React framework */
          body, html, #root {
            height: 100%;
            margin: 0;
            overflow-x: hidden;
          }
        `}</style>
        {showVictory && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'popIn 0.5s ease-out' }}>
              <div style={{ fontSize: '40px', color: '#FFD700', textShadow: '4px 4px 0 #FF4500', marginBottom: '20px', animation: 'bounce 1s infinite' }}>VICTORY!</div>
              <img src="https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" alt="Celebration" style={{ width: '300px', borderRadius: '20px', border: '5px solid #FFD700', marginBottom: '30px' }} />
              <div style={{ color: 'white', marginBottom: '20px', fontSize: '14px' }}>
                  Phewww, made it just in time!
              </div>
              <button onClick={() => { setShowVictory(false); resetAll(); }} style={{ padding: '15px 30px', fontSize: '18px', backgroundColor: '#32CD32', color: 'white', border: '4px solid white', borderRadius: '10px', cursor: 'pointer', fontFamily: '"Press Start 2P"' }}>PLAY AGAIN</button>
            </div>
        )}
        <div style={{ maxWidth: editing ? '1400px' : '1100px', margin: '0 auto', backgroundColor: '#F5DEB3', padding: '30px', border: '8px solid #8B4513', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
          <h1 style={{ textAlign: 'center', fontSize: '20px', color: '#8B0000', marginBottom: '20px', textShadow: '4px 4px 0px #FFD700', animation: 'bounce 2s ease-in-out infinite', letterSpacing: '2px' }}>CAMPUSQUEST<br/>An IITGN GridWorld</h1>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ position: 'relative' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_W}, ${CELL_SIZE}px)`, border: '8px solid #8B4513', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.5)', backgroundColor: '#2F4F4F', cursor: editing ? 'crosshair' : 'default' }}>
                    {Array.from({ length: GRID_H }).map((_, r) => ( Array.from({ length: GRID_W }).map((_, c) => {
                        const lm = landmarkAt(r, c, landmarks); const isAgent = agent.r === r && agent.c === c; const wall = isWall(r, c, walls); const inPath = pathSet.has(`${r},${c}`);
                        return (
                            <div key={`${r}-${c}`} onClick={() => handleCellClick(r, c)} style={{ width: CELL_SIZE, height: CELL_SIZE, border: '4px solid #654321', position: 'relative', backgroundColor: wall ? '#CD5C5C' : '#8B7355', boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.3)', overflow: 'hidden', opacity: running ? 0.7 : 1, transition: 'background-color 0.2s', filter: editing ? 'grayscale(30%)' : 'none', pointerEvents: editing ? 'auto' : 'none' }}>
                            {editing && (<div style={{ position: 'absolute', top: 0, left: 0, right: 0, fontSize: '8px', color: 'white', textAlign: 'center', pointerEvents: 'none', backgroundColor: lm && lm.isStart ? '#DC143C88' : 'transparent', fontWeight: 'bold' }}>{r},{c}</div>)}
                            {lm && (<div style={{ position: 'absolute', inset: 0, fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', textShadow: '2px 2px 0px rgba(0,0,0,0.3)', border: lm.isTarget ? '4px solid #FFD700' : 'none', animation: lm.isTarget ? 'glow 1.5s ease-in-out infinite' : 'none' }}>{lm.emoji}</div>)}
                            {inPath && !isAgent && (<div style={{ position: 'absolute', inset: 0, backgroundColor: '#FFD700', opacity: 0.3 }} />)}
                            {isAgent && (<div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', animation: 'glow 1s ease-in-out infinite' }}>🎒</div>)}
                            {lm && (<div style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '7px', textAlign: 'center', padding: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{lm.name} ({lm.reward > 0 ? '+' : ''}{lm.reward})</div>)}
                            </div>
                        ); }) ))}
                    </div>
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>{particles.map(p => (<circle key={p.id} cx={p.x} cy={p.y} r={3} fill={p.color} opacity={p.life} />))}</svg>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '280px' }}>
              <div style={{ backgroundColor: '#2F4F4F', padding: '15px', borderRadius: '10px', border: '4px solid #1C1C1C', color: '#00FF00', fontSize: '10px', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 'bold' }}>SYSTEM STATUS</div>
                  <button onClick={() => setSoundEnabled(!soundEnabled)} className="config-button" style={{ padding: '5px', backgroundColor: '#1C1C1C', border: '2px solid #00FF00', borderRadius: '5px', cursor: 'pointer', color: '#00FF00', display: 'flex' }}>{soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}</button>
                </div>
                <div>GRID: {GRID_H}x{GRID_W}</div><div>ALGO: {trainingMode || 'None'}</div><div>Q-SIZE: {Object.keys(Qtable).length}</div>
              </div>
              <div style={{ backgroundColor: '#FAEBD7', padding: '15px', borderRadius: '10px', border: '4px solid #8B4513' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center', color: '#8B4513' }}>CONTROL</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => setEditing(p => { if (!p) resetAll(); return !p; })} disabled={running} className="config-button" style={{ padding: '12px', fontSize: '10px', backgroundColor: editing ? '#DC143C' : '#FFD700', color: editing ? 'white' : '#8B0000', border: '4px solid #000', borderRadius: '8px', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '4px 4px 0px #000', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit size={14} style={{ marginRight: '8px' }}/> {editing ? 'EXIT EDIT' : 'EDIT MAP'}</button>
                    
                    {/* RESTORED MANUAL CONTROL BUTTONS */}
                    <div style={{ opacity: editing ? 0.4 : 1, pointerEvents: editing ? 'none' : 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => handleMove('UP')} disabled={running} className="config-button" style={{ padding: '10px 20px', fontSize: '10px', backgroundColor: '#4169E1', color: 'white', border: '4px solid #000', borderRadius: '8px', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '4px 4px 0px #000', width: '50%' }}>UP</button>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleMove('LEFT')} disabled={running} className="config-button" style={{ padding: '10px 20px', fontSize: '10px', backgroundColor: '#4169E1', color: 'white', border: '4px solid #000', borderRadius: '8px', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '4px 4px 0px #000' }}>LEFT</button>
                            <button onClick={() => handleMove('RIGHT')} disabled={running} className="config-button" style={{ padding: '10px 20px', fontSize: '10px', backgroundColor: '#4169E1', color: 'white', border: '4px solid #000', borderRadius: '8px', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '4px 4px 0px #000' }}>RIGHT</button>
                        </div>
                        <button onClick={() => handleMove('DOWN')} disabled={running} className="config-button" style={{ padding: '10px 20px', fontSize: '10px', backgroundColor: '#4169E1', color: 'white', border: '4px solid #000', borderRadius: '8px', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '4px 4px 0px #000', width: '50%' }}>DOWN</button>
                    </div>

                    <div style={{ opacity: editing ? 0.4 : 1, pointerEvents: editing ? 'none' : 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => runTraining('SARSA')} disabled={running} className="config-button" style={{ padding: '10px', fontSize: '9px', backgroundColor: '#32CD32', color: 'white', border: '4px solid #000', borderRadius: '8px', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '4px 4px 0px #000', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Brain size={12} style={{marginRight: '4px'}}/> SARSA</button>
                            <button onClick={() => runTraining('Q')} disabled={running} className="config-button" style={{ padding: '10px', fontSize: '9px', backgroundColor: '#9370DB', color: 'white', border: '4px solid #000', borderRadius: '8px', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '4px 4px 0px #000', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Activity size={12} style={{marginRight: '4px'}}/> Q-LEARN</button>
                        </div>
                        <button onClick={() => runTraining('DQN')} disabled={running} className="config-button" style={{ padding: '10px', fontSize: '9px', backgroundColor: '#1E90FF', color: 'white', border: '4px solid #000', borderRadius: '8px', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '4px 4px 0px #000', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={12} style={{marginRight: '4px'}}/> DEEP Q (Approx)</button>
                        
                        <div style={{ width: '100%', height: '2px', backgroundColor: '#8B4513', margin: '5px 0' }}></div>

                        <button onClick={playLearnedPath} disabled={running} className="config-button" style={{ padding: '12px', fontSize: '10px', backgroundColor: '#FFA500', color: 'white', border: '4px solid #000', borderRadius: '8px', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '4px 4px 0px #000' }}>PLAY PATH</button>
                        <button onClick={() => resetAll()} disabled={running} className="config-button" style={{ padding: '12px', fontSize: '10px', backgroundColor: '#DC143C', color: 'white', border: '4px solid #000', borderRadius: '8px', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '4px 4px 0px #000' }}>RESET</button>
                    </div>
                </div>
              </div>
            </div>
            {editing && (
                <div style={{ width: '350px', backgroundColor: '#1C1C1C', padding: '15px', borderRadius: '10px', border: '4px solid #FFD700', color: '#00FF00', fontSize: '9px', boxShadow: '0 8px 16px rgba(0,0,0,0.5)', maxHeight: '750px', overflowY: 'auto' }}>
                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', marginBottom: '15px', color: '#FFD700' }}>🌐 CONFIGURATION PANEL</div>
                    <GridSizeConfig GRID_W={GRID_W} setGridW={setGridW} GRID_H={GRID_H} setGridH={setGridH} resetAll={resetAll} inputStyle={inputStyle} buttonStyle={buttonStyle} />
                    <LandmarkBuilder newLmName={newLmName} setNewLmName={setNewLmName} newLmEmoji={newLmEmoji} setNewLmEmoji={setNewLmEmoji} newLmR={newLmR} setNewLmR={setNewLmR} newLmC={newLmC} setNewLmC={setNewLmC} newLmReward={newLmReward} setNewLmReward={setNewLmReward} handleAddLandmark={handleAddLandmark} GRID_H={GRID_H} GRID_W={GRID_W} inputStyle={inputStyle} buttonStyle={buttonStyle} />
                    <LandmarkSettings landmarks={landmarks} handleRewardChange={handleRewardChange} handleTargetToggle={handleTargetToggle} handleRemoveLandmark={handleRemoveLandmark} handleCoordChange={handleCoordChange} GRID_H={GRID_H} GRID_W={GRID_W} inputStyle={inputStyle} buttonStyle={buttonStyle} />
                    <WallStatus walls={walls} />
                </div>
            )}
            <div style={{ backgroundColor: '#2F4F4F', padding: '12px', borderRadius: '10px', border: '4px solid #1C1C1C', height: '200px', overflowY: 'auto', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)', width: '280px', display: editing ? 'none' : 'block' }}>
                <div style={{ color: '#00FF00', fontSize: '9px', fontWeight: 'bold', marginBottom: '8px' }}>EVENT LOG</div>
                <div style={{ color: '#00FF00', fontSize: '8px', lineHeight: '1.6' }}>{log.length === 0 && <div style={{ opacity: 0.5 }}>No events yet...</div>}{log.map((l, i) => (<div key={i} style={{ marginBottom: '4px' }}>&gt; {l}</div>))}</div>
            </div>
          </div>
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#FAEBD7', borderRadius: '10px', border: '4px solid #8B4513', fontSize: '9px', lineHeight: '1.6', color: '#2F4F4F', textAlign: 'center' }}><strong>HOW TO PLAY:</strong> Choose an algorithm (Q-Learn, SARSA, or DQN) to train the agent to find {targetLm ? targetLm[0] : 'the Goal'}. Then click PLAY PATH.</div>
        </div>
      </div>
    </>
  );
}

// --- CONFIG SUB-COMPONENTS ---
const GridSizeConfig = ({ GRID_W, setGridW, GRID_H, setGridH, resetAll, inputStyle, buttonStyle }) => (
    <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #00FF0055' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Grid Size (W x H)</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="number" value={GRID_W} onChange={(e) => setGridW(Math.max(2, Math.min(15, parseInt(e.target.value) || 9)))} style={{ ...inputStyle, width: '40px' }} min="2" max="15" /> x
            <input type="number" value={GRID_H} onChange={(e) => setGridH(Math.max(2, Math.min(15, parseInt(e.target.value) || 7)))} style={{ ...inputStyle, width: '40px' }} min="2" max="15" />
            <button onClick={() => resetAll()} style={{ ...buttonStyle, backgroundColor: '#DC143C', flexGrow: 1 }}>APPLY & RESET</button>
        </div>
    </div>
);
const LandmarkBuilder = ({ newLmName, setNewLmName, newLmEmoji, setNewLmEmoji, newLmR, setNewLmR, newLmC, setNewLmC, newLmReward, setNewLmReward, handleAddLandmark, GRID_H, GRID_W, inputStyle, buttonStyle }) => (
    <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #00FF0055' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center' }}><Plus size={14} style={{marginRight: '5px'}}/> Landmark Builder</div>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
            <input placeholder="Name" value={newLmName} onChange={e => setNewLmName(e.target.value)} style={{ ...inputStyle, flexGrow: 1, color: 'white' }} />
            <input placeholder="Emoji" value={newLmEmoji} onChange={e => setNewLmEmoji(e.target.value.slice(0, 2))} style={{ ...inputStyle, width: '40px', textAlign: 'center' }} />
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '8px' }}>
            <MapPin size={12} /> R: <input type="number" value={newLmR} onChange={e => setNewLmR(Math.max(0, Math.min(GRID_H - 1, parseInt(e.target.value) || 0)))} style={{ ...inputStyle, width: '40px' }} min="0" max={GRID_H - 1} />
            C: <input type="number" value={newLmC} onChange={e => setNewLmC(Math.max(0, Math.min(GRID_W - 1, parseInt(e.target.value) || 0)))} style={{ ...inputStyle, width: '40px' }} min="0" max={GRID_W - 1} />
            Rwd: <input type="number" step="0.1" value={newLmReward} onChange={e => setNewLmReward(e.target.value)} style={{ ...inputStyle, width: '50px', color: newLmReward >= 0 ? '#32CD32' : '#DC143C' }} />
        </div>
        <button onClick={handleAddLandmark} style={{ ...buttonStyle, backgroundColor: '#4169E1', color: 'white', width: '100%' }}>ADD LANDMARK TO GRID</button>
    </div>
);
const LandmarkSettings = ({ landmarks, handleRewardChange, handleTargetToggle, handleRemoveLandmark, handleCoordChange, GRID_H, GRID_W, inputStyle, buttonStyle }) => (
    <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #00FF0055' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>📍 Existing Landmark Settings</div>
        {Object.entries(landmarks).map(([name, data]) => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px', padding: '8px', border: '1px solid #00FF0033', backgroundColor: data.isTarget ? '#FFD70022' : 'transparent', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flexShrink: 0, fontSize: '18px' }}>{data.emoji}</div>
                    <div style={{ flexGrow: 1, color: 'white', marginLeft: '10px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{name} {data.isStart && '(START)'}</div>
                    </div>
                    {!data.isStart && (<button onClick={() => handleRemoveLandmark(name)} style={{ ...buttonStyle, backgroundColor: '#DC143C', color: 'white', padding: '4px 8px', height: 'auto' }}><Trash2 size={10} /></button>)}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ fontSize: '8px', minWidth: '40px' }}>Rwd:</div>
                    <input type="number" step="0.1" value={data.reward} onChange={(e) => handleRewardChange(name, e.target.value)} style={{ ...inputStyle, width: '60px', color: data.reward >= 0 ? '#32CD32' : '#DC143C' }} />
                    <div style={{ fontSize: '8px', minWidth: '35px' }}>Coords:</div>
                    <input type="number" value={data.r} onChange={e => handleCoordChange(name, 'r', e.target.value)} style={{ ...inputStyle, width: '40px' }} min="0" max={GRID_H - 1} />
                    <input type="number" value={data.c} onChange={e => handleCoordChange(name, 'c', e.target.value)} style={{ ...inputStyle, width: '40px' }} min="0" max={GRID_W - 1} />
                </div>
                <div style={{ marginTop: '5px' }}>
                    {!data.isStart && (<button onClick={() => handleTargetToggle(name)} style={{ ...buttonStyle, backgroundColor: data.isTarget ? '#FFA500' : '#4169E1', color: 'white', fontWeight: 'bold', fontSize: '8px', padding: '4px 8px', height: 'auto', width: '100%' }}>{data.isTarget ? 'CURRENT TARGET' : 'SET AS TARGET'}</button>)}
                </div>
            </div>
        ))}
    </div>
);
const WallStatus = ({ walls }) => (
    <div style={{ marginTop: '5px', borderTop: '1px solid #00FF0055', paddingTop: '10px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>🧱 Current Walls: {walls.length}</div>
        <div style={{ fontSize: '8px', lineHeight: '1.4' }}>{walls.map(w => `(${w.r},${w.c})`).join(', ')}</div>
        <div style={{ marginTop: '10px', color: '#FFD700' }}>*Click cells on the grid to add/remove Walls. Edit Landmarks via the list above.</div>
    </div>
);

const inputStyle = { backgroundColor: '#333', color: '#00FF00', border: '1px solid #00FF00', padding: '4px 8px', fontSize: '9px', borderRadius: '3px', textAlign: 'center', fontFamily: '"Press Start 2P", monospace' };
const buttonStyle = { padding: '6px 10px', fontSize: '9px', border: '2px solid #000', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '2px 2px 0px #000', fontFamily: '"Press Start 2P", monospace', whiteSpace: 'nowrap' };