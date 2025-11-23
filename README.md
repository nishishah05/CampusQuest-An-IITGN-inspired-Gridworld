# CampusQuest: An IITGN-inspired Gridworld

**CampusQuest** is an interactive Reinforcement Learning (RL) simulation designed to gamify the experience of navigating the IIT Gandhinagar campus. Built with React.js, this application allows users to train AI agents using various algorithms to find the optimal path from the hostels to the academic blocks, avoiding distractions and collecting rewards along the way.

The project features a retro pixel-art aesthetic, immersive sound effects, and a fully configurable environment.

---
<img width="2219" height="1197" alt="image" src="https://github.com/user-attachments/assets/aa843143-5515-4761-b68a-d4089acd3b44" />

## User Interface Overview

The application is divided into three main sections designed for clarity and interaction:

### 1. The Main Grid 
* **The Campus Map:** A $7 \times 9$ grid representing the campus layout.
* **The Agent:** Represented by a **Backpack (🎒)** icon.
* **Landmarks:**
    * **Start:** Ijokha Hostel (🏠).
    * **Goal:** AB10 (🏛️) - The ultimate destination with a high reward.
    * **Bonus Areas:** Library (📚) and Workspace (💻).
    * **Obstacles:** Walls (🧱).
    * **Penalties:** Tea Post (☕), 2D Lab (🍵), Atul Bakery (🥐), Friend Meet (👋), and Dogs (🐕).
* **Visuals:** The grid overlays an image of the iconic **Lal Minar** (retro-fied :)).

### 2. Control Panel 
* **System Status:** Displays real-time stats like the current Grid Size, the active Algorithm, and the size of the Q-Table (memory).
* **Audio Toggle:** A button to mute/unmute the sound effects.

### 3. Action Center 
* **Manual Controls:** D-Pad style buttons (UP, DOWN, LEFT, RIGHT) for manual navigation.
* **Algorithm Selection:** Dedicated buttons to trigger **Q-LEARN**, **SARSA**, or **DEEP Q**.
* **Playback:** A "PLAY PATH" button to visualize the agent's learned strategy.
* **Edit Mode:** A toggle button to unlock the "Configuration Panel" for modifying the map.
* **Event Log:** A scrolling terminal at the bottom that displays system messages, rewards collected, and training progress.

---

## How to Use the App (Step-by-Step)

### Step 1: Manual Exploration (Imitation Learning)
Before training, you can "teach" it by playing yourself!
1.  Use the **Arrow Keys** on your keyboard or the **Blue Buttons** on the screen.
2.  Guide the backpack 🎒 from the Hostel 🏠 to AB10 🏛️.
3.  **Tip:** Avoid the 2D Cafe (🍵) and Tea Post (☕) as they give negative rewards. Visit the Library (📚) for bonus points!
4.  *Note: Every path you complete manually is saved and used to jump-start the AI's training.*

### Step 2: Training
Choose one of the three Reinforcement Learning algorithms to solve the maze automatically.

* **Click "Q-LEARN":** Best for finding the absolute shortest path, even if it's risky (walking close to penalties).
* **Click "SARSA":** Best for finding a "safe" path. The agent might take a longer route to avoid accidentally slipping into a penalty zone.
* **Click "DEEP Q (Approx)":** Uses a linear approximation instead of a table. Watch how it generalizes direction rather than memorizing specific cells.

*Wait for the "Training complete!" message in the Event Log.*

### Step 3: Watch the Result
Once training is done:
1.  Click the orange **"PLAY PATH"** button.
2.  The agent will execute the learned strategy step-by-step.
3.  **Victory:** If the agent reaches AB10, enjoy the **Mega Celebration** with confetti, fanfare music, and a dancing victory popup! 💃🎉

### Step 4: Customize the World (Edit Mode)
Want to make the game harder or change the layout?
1.  Click the yellow **"EDIT MAP"** button. The Control Panel will flip to the **Configuration Panel**.
2.  **Move Walls:** Click any empty cell on the grid to place a Wall (🧱). Click a wall to remove it.
3.  **Move Landmarks:**
    * Find the landmark in the list (e.g., "Library").
    * Change its **Row (R)** and **Col (C)** coordinates using the inputs.
    * Change its **Reward** value (e.g., make the Library worth +50 points).
4.  **Add New Landmarks:** Use the "Landmark Builder" at the top of the panel to create custom stops (give it a name, an emoji, and a reward value).
5.  Click **"EXIT EDIT"** to save your changes and reset the memory.

---

## 🛠️ Key Functionalities

### 1. Reinforcement Learning Algorithms
* **Q-Learning (Off-Policy):** A greedy algorithm that learns the value of the optimal action sequence.
* **SARSA (On-Policy):** A conservative algorithm that learns the value of the policy actually being followed, accounting for exploration risks.
* **Deep Q-Learning (Linear Approximation):** Demonstrates how RL scales to larger environments by approximating values using features (coordinates) and weights instead of a lookup table.

### 2. Dynamic Environment Editing
Unlike static gridworlds, CampusQuest allows users to redesign the map in real-time. You can create mazes, move the goal, or surround the agent with obstacles to test how different algorithms adapt to new challenges.

### 3. Imitation Learning
The app records every move you make during "Manual Control." When you click a training button, the AI first replays your manual episodes to learn from your behavior before starting its own random exploration.

### 4. Audio-Visual Feedback
* **Soundscapes:** Distinct 8-bit sounds for positive rewards (chimes), penalties (buzzers), and movement.
* **Particle Effects:** Visual trails follow the agent, and gold/red sparks appear when collecting rewards or hitting penalties.
* **Victory Mode:** A dedicated modal overlay with animations triggers upon successful completion of the goal.

---

## 📦 Tech Stack
* **React.js**: Component-based UI architecture.
* **Web Audio API**: Custom-synthesized sound effects (oscillators) with no external assets required.
* **Lucide React**: For vector icons.
* **CSS Modules**: For the retro pixel-art styling and animations.
