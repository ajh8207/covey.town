# Graveyard Shift — Task Specifications

This document specifies the required and medium-priority task types for Graveyard Shift, including their mechanics, player input, server-side validation, and timing. Additional task concepts are listed for possible future implementation.

## Required Tasks

### Unlock Manifolds

| Field | Specification |
|---|---|
| **Difficulty** | Easy |
| **Puzzle** | Enter numbers in ascending order. |
| **Player Input** | Click keypad numbers in the specified order. |
| **Server Check** | Verify that the entered order matches the assigned order. |
| **Timing** | No time limit. Closing the interface prematurely resets the task. |

### Wiring

| Field | Specification |
|---|---|
| **Difficulty** | Easy |
| **Puzzle** | Match wires of the same color. |
| **Player Input** | Drag each wire to its corresponding connection point. |
| **Server Check** | Verify that all connections are correct. |
| **Timing** | No time limit. Closing the interface prematurely resets the task. |

### Impostor Fake Tasks

| Field | Specification |
|---|---|
| **Difficulty** | Varying |
| **Puzzle** | A combination of crewmate tasks. |
| **Player Input** | Interact with the task as a crewmate would. |
| **Server Check** | Track individual task activity without increasing the Crewmate task bar. |
| **Timing** | No time limit. |

## Medium-Priority Tasks

### Swipe Card

| Field | Specification |
|---|---|
| **Difficulty** | Easy |
| **Puzzle** | Swipe an ID card through a reader. |
| **Player Input** | Drag the ID card through the reader in a straight line. |
| **Server Check** | Verify that the swipe meets the task's success conditions. |
| **Timing** | No time limit. |

### Data Transfer (Multi-Room)

| Field | Specification |
|---|---|
| **Difficulty** | Medium |
| **Puzzle** | Download data in one room and upload it in another. |
| **Player Input** | Start the download and upload, keeping each menu open uninterrupted until its stage finishes. |
| **Server Check** | Verify that both stages are completed in the correct order. |
| **Timing** | Download: 7 seconds. Upload: 5 seconds. Leaving the menu resets the current stage. |

## Future Tasks — Low Priority

### Pattern Recognition

| Field | Specification |
|---|---|
| **Difficulty** | Easy |
| **Puzzle** | Reproduce a displayed pattern on a 4×4 grid. |
| **Player Input** | Click keys in the correct order. |
| **Server Check** | Verify that the final sequence matches the original. |
| **Timing** | No time limit. |

### Shoot Asteroids

| Field | Specification |
|---|---|
| **Difficulty** | Medium |
| **Puzzle** | Shoot each asteroid. |
| **Player Input** | Click flying asteroids as they approach the mini rocket. |
| **Server Check** | Verify that every asteroid is hit before passing the rocket or colliding with it. |
| **Timing** | 15 seconds. |

### Refuel Station (Multi-Room)

| Field | Specification |
|---|---|
| **Difficulty** | Medium |
| **Puzzle** | Transfer gas from a gas can into the fuel tank. |
| **Player Input** | Click and hold the gas can to collect gas, then click and hold the fuel tank to fill it. |
| **Server Check** | Verify that all gas has been collected and the fuel tank is completely filled. |
| **Timing** | Collecting gas: 5 seconds. Filling the tank: 5 seconds. Leaving the menu resets progress. |

### Handprint Scanner

| Field | Specification |
|---|---|
| **Difficulty** | Medium |
| **Puzzle** | Verify identity using handprint recognition. |
| **Player Input** | Click the scanner and hold until the scan completes. |
| **Server Check** | Verify that the player maintains the interaction for the full scan duration. |
| **Timing** | 6 seconds. Leaving the menu resets progress. |

### Reactor Stabilizer (Multi-Room)

| Field | Specification |
|---|---|
| **Difficulty** | Hard |
| **Puzzle** | Enter a unique, player-specific system reboot code obtained from the electrical panel. |
| **Player Input** | View the five-letter code, confirm it, then visit the reactor and enter it. The displayed code changes every 5 seconds. |
| **Server Check** | Verify that the reactor input matches the code the player confirmed. |
| **Timing** | The player must confirm the code within 5 seconds of it appearing. Once confirmed, that code remains the working code for the task. |

### Engine Alignment

| Field | Specification |
|---|---|
| **Difficulty** | Hard |
| **Puzzle** | Align three engine components with their target positions. |
| **Player Input** | Use the left and right arrow keys to rotate the components. |
| **Server Check** | Verify that each component is within the allowed alignment bounds. |
| **Timing** | No time limit. |
