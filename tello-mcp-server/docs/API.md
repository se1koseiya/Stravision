# Tello Edge Control Node API Documentation

This document describes the API interfaces provided by the Tello Edge Control Node.

## 1. RESTful API

Base URL: `http://localhost:3001` (Default)

### 1.1 Get Drone State
**Endpoint**: `GET /api/state`
**Description**: Returns the current telemetry data from the drone.
**Response**:
```json
{
  "pitch": 0,
  "roll": 0,
  "yaw": 0,
  "vgx": 0,
  "vgy": 0,
  "vgz": 0,
  "templ": 0,
  "temph": 0,
  "tof": 10,
  "h": 0,
  "bat": 100,
  "baro": 0.00,
  "time": 0,
  "agx": 0.00,
  "agy": 0.00,
  "agz": 0.00
}
```

### 1.2 Send Command
**Endpoint**: `POST /api/command`
**Description**: Sends a raw Tello SDK command.
**Body**:
```json
{
  "command": "takeoff"
}
```
**Response**:
```json
{
  "result": "ok"
}
```

## 2. WebSocket API

URL: `ws://localhost:3001/ws`

### 2.1 Connection
Connect to the WebSocket to receive real-time state updates and send commands.

## 3. MCP (Model Context Protocol) Interface

This node runs as an MCP server over Stdio.

### 3.1 Tools
- `takeoff`: Initiates takeoff.
- `land`: Initiates landing.
- `emergency`: Emergency stop.
- `move`: Move the drone.
  - Arguments: `direction` (up, down, left, right, forward, back), `distance` (cm).
- `rotate`: Rotate the drone.
  - Arguments: `direction` (cw, ccw), `degrees`.
- `flip`: Flip the drone.
  - Arguments: `direction` (l, r, f, b).
- `command`: Send raw command.
  - Arguments: `cmd` (string).
- `start_cruise_mission`: Start a Mission Pad cruise task.
  - Arguments: `padA` (1-8), `padB` (1-8), `loops` (1-10).
  - Description: Flies between two mission pads, performing simulated scans at each point.
- `stop_mission`: Stop the current running mission.

### 3.2 Resources
- `tello://state`: Returns current drone state as JSON.
