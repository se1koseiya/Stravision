# UI State Synchronization Verification Guide

## Overview
This document provides a comprehensive guide for verifying that the Search button UI state synchronization works correctly in the AI Assistant page.

## Requirements
- **Requirement 1.1**: WHEN 用户点击Search按钮启用搜索功能 THEN 系统应当将enableSearch状态设置为true并在UI上显示激活状态

## Test Environment Setup
1. Start the development server: `npm run dev`
2. Open browser to `http://localhost:3000/ai-assistant`
3. Open Browser DevTools (F12)
4. Navigate to the Network tab in DevTools

## Verification Tests

### Test 1: Initial State Verification
**Objective**: Verify that the Search button initializes with the correct inactive state.

**Steps**:
1. Load the AI Assistant page
2. Locate the Search button (has Globe icon and "Search" text)
3. Inspect the button element

**Expected Results**:
- Button has `bg-white` class (white background)
- Button has `text-gray-500` class (gray text)
- Button has `border-gray-200` class (light gray border)
- Button does NOT have `bg-blue-50` class
- Button does NOT have `shadow-sm` class

**Status**: ☐ Pass ☐ Fail

---

### Test 2: State Toggle - Enable Search
**Objective**: Verify that clicking the Search button updates the UI to show active state.

**Steps**:
1. Click the Search button once
2. Observe the visual changes
3. Inspect the button element classes

**Expected Results**:
- Button background changes to blue (`bg-blue-50`)
- Button text changes to blue (`text-blue-600`)
- Button border changes to blue (`border-blue-200`)
- Button gains shadow effect (`shadow-sm`)
- Visual transition is smooth

**Status**: ☐ Pass ☐ Fail

---

### Test 3: State Toggle - Disable Search
**Objective**: Verify that clicking the Search button again returns it to inactive state.

**Steps**:
1. With Search enabled (button is blue), click the Search button again
2. Observe the visual changes
3. Inspect the button element classes

**Expected Results**:
- Button background returns to white (`bg-white`)
- Button text returns to gray (`text-gray-500`)
- Button border returns to light gray (`border-gray-200`)
- Shadow effect is removed
- Visual transition is smooth

**Status**: ☐ Pass ☐ Fail

---

### Test 4: Globe Icon Presence
**Objective**: Verify that the Globe icon is always visible in the Search button.

**Steps**:
1. Inspect the Search button
2. Look for an SVG element inside the button
3. Toggle the button state multiple times

**Expected Results**:
- Globe icon (SVG) is present in both active and inactive states
- Icon color changes with button state (gray → blue → gray)
- Icon size is 14px (`size={14}`)

**Status**: ☐ Pass ☐ Fail

---

### Test 5: API Request State Propagation
**Objective**: Verify that enableSearch state is correctly passed in API requests.

**Steps**:
1. Open Browser DevTools Network tab
2. Clear network log
3. Click Search button to enable search (button turns blue)
4. Type a test message in the input field
5. Send the message
6. Find the `/api/chat` request in the Network tab
7. Click on the request and view the "Payload" or "Request" tab
8. Examine the request body JSON

**Expected Results**:
- Request body contains `"enableSearch": true`
- Request body structure matches:
  ```json
  {
    "messages": [...],
    "model": "...",
    "apiKey": "...",
    "apiUrl": "...",
    "systemPrompt": "...",
    "sessionId": "...",
    "enableSearch": true,
    "enableReasoning": false,
    "deviceData": ...,
    "weatherData": ...
  }
  ```

**Status**: ☐ Pass ☐ Fail

---

### Test 6: API Request State Propagation (Disabled)
**Objective**: Verify that enableSearch is false when search is disabled.

**Steps**:
1. Ensure Search button is in inactive state (gray)
2. Clear network log in DevTools
3. Type a test message and send
4. Find the `/api/chat` request
5. Examine the request body JSON

**Expected Results**:
- Request body contains `"enableSearch": false`

**Status**: ☐ Pass ☐ Fail

---

### Test 7: Rapid Toggle Consistency
**Objective**: Verify that rapid clicking maintains UI consistency.

**Steps**:
1. Click the Search button rapidly 10 times
2. Observe the visual state after each click
3. Check for any visual glitches or state desynchronization

**Expected Results**:
- Button alternates between active and inactive states consistently
- No visual glitches (flickering, stuck states, etc.)
- Final state matches the number of clicks (even = inactive, odd = active)
- No console errors

**Status**: ☐ Pass ☐ Fail

---

### Test 8: Model Compatibility Warning
**Objective**: Verify that a warning is shown when search is enabled with an unsupported model.

**Steps**:
1. Open Settings dialog
2. Change model to `gpt-3.5-turbo` (unsupported model)
3. Save settings
4. Click the Search button to enable search
5. Look for a warning notice/toast

**Expected Results**:
- A warning notice appears (typically in bottom-right corner)
- Notice title: "搜索功能不可用"
- Notice description mentions the model doesn't support search
- Notice has error variant (red icon)
- Button still toggles to active state

**Status**: ☐ Pass ☐ Fail

---

### Test 9: State Persistence Across Page Interactions
**Objective**: Verify that search state remains consistent during other page interactions.

**Steps**:
1. Enable search (button turns blue)
2. Type a message but don't send
3. Click on sidebar items
4. Open and close settings dialog
5. Check if Search button is still blue

**Expected Results**:
- Search button remains in active state (blue)
- State is not affected by other UI interactions

**Status**: ☐ Pass ☐ Fail

---

### Test 10: Visual Indicator Synchronization
**Objective**: Verify all visual indicators change together.

**Steps**:
1. Click Search button to enable
2. Simultaneously observe:
   - Background color
   - Text color
   - Border color
   - Shadow effect
   - Icon color

**Expected Results**:
- All visual indicators change simultaneously
- No delayed or staggered transitions
- Transition duration is smooth (~200-300ms)

**Status**: ☐ Pass ☐ Fail

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Initial State | ☐ | |
| 2. Enable Search | ☐ | |
| 3. Disable Search | ☐ | |
| 4. Globe Icon | ☐ | |
| 5. API Propagation (Enabled) | ☐ | |
| 6. API Propagation (Disabled) | ☐ | |
| 7. Rapid Toggle | ☐ | |
| 8. Model Warning | ☐ | |
| 9. State Persistence | ☐ | |
| 10. Visual Sync | ☐ | |

## Known Issues
_Document any issues found during testing here_

## Screenshots
_Attach screenshots showing:_
1. Search button in inactive state
2. Search button in active state
3. Network request showing enableSearch: true
4. Warning notice for unsupported model

## Conclusion
All tests must pass for the UI state synchronization to be considered complete and correct.

**Overall Status**: ☐ Pass ☐ Fail

**Tested By**: _______________
**Date**: _______________
**Browser**: _______________
**Version**: _______________
