/**
 * Chat Scroll Control - Browser Console Test Helper
 * 
 * Copy and paste this script into your browser console while on the chat page
 * to help with manual testing of scroll behavior.
 */

(function() {
  console.log('🧪 Chat Scroll Test Helper Loaded');
  console.log('=====================================\n');

  // Find the scroll container
  function getScrollContainer() {
    const container = document.querySelector('[class*="overflow-y-auto"]');
    if (!container) {
      console.error('❌ Could not find scroll container');
      return null;
    }
    return container;
  }

  // Get scroll information
  window.getScrollInfo = function() {
    const container = getScrollContainer();
    if (!container) return;

    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const threshold = 100;
    const isAtBottom = distanceFromBottom < threshold;

    console.log('📊 Scroll Information:');
    console.log('  scrollTop:', scrollTop);
    console.log('  scrollHeight:', scrollHeight);
    console.log('  clientHeight:', clientHeight);
    console.log('  distanceFromBottom:', distanceFromBottom + 'px');
    console.log('  threshold:', threshold + 'px');
    console.log('  isAtBottom:', isAtBottom ? '✅ YES' : '❌ NO');
    console.log('  Status:', isAtBottom ? '🟢 Auto-scroll ENABLED' : '🔴 Auto-scroll DISABLED');
    console.log('');

    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      distanceFromBottom,
      threshold,
      isAtBottom
    };
  };

  // Scroll to specific distance from bottom
  window.scrollToDistance = function(distanceFromBottom) {
    const container = getScrollContainer();
    if (!container) return;

    const targetScrollTop = container.scrollHeight - container.clientHeight - distanceFromBottom;
    container.scrollTop = targetScrollTop;
    
    console.log(`📍 Scrolled to ${distanceFromBottom}px from bottom`);
    setTimeout(() => window.getScrollInfo(), 100);
  };

  // Test threshold boundary
  window.testThreshold = function() {
    console.log('🧪 Testing Threshold Boundary (100px)');
    console.log('=====================================\n');

    console.log('Test 1: Scroll to 99px from bottom (should be AT bottom)');
    window.scrollToDistance(99);

    setTimeout(() => {
      console.log('\nTest 2: Scroll to 100px from bottom (should be AT bottom - edge case)');
      window.scrollToDistance(100);
    }, 2000);

    setTimeout(() => {
      console.log('\nTest 3: Scroll to 101px from bottom (should NOT be at bottom)');
      window.scrollToDistance(101);
    }, 4000);

    setTimeout(() => {
      console.log('\n✅ Threshold test complete!');
      console.log('Expected results:');
      console.log('  - 99px: Auto-scroll ENABLED ✅');
      console.log('  - 100px: Auto-scroll ENABLED ✅ (edge case)');
      console.log('  - 101px: Auto-scroll DISABLED ❌');
    }, 6000);
  };

  // Scroll to bottom
  window.scrollToBottom = function(behavior = 'smooth') {
    const container = getScrollContainer();
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: behavior
    });

    console.log('⬇️ Scrolling to bottom with behavior:', behavior);
    setTimeout(() => window.getScrollInfo(), 500);
  };

  // Scroll to top
  window.scrollToTop = function(behavior = 'smooth') {
    const container = getScrollContainer();
    if (!container) return;

    container.scrollTo({
      top: 0,
      behavior: behavior
    });

    console.log('⬆️ Scrolling to top with behavior:', behavior);
    setTimeout(() => window.getScrollInfo(), 500);
  };

  // Monitor scroll events
  let scrollMonitorActive = false;
  let scrollEventCount = 0;
  let lastScrollTime = 0;

  window.startScrollMonitor = function() {
    const container = getScrollContainer();
    if (!container) return;

    if (scrollMonitorActive) {
      console.log('⚠️ Scroll monitor already active');
      return;
    }

    scrollMonitorActive = true;
    scrollEventCount = 0;
    console.log('👀 Scroll monitor started');
    console.log('Scroll the chat to see events...\n');

    container.addEventListener('scroll', handleScrollEvent);
  };

  window.stopScrollMonitor = function() {
    const container = getScrollContainer();
    if (!container) return;

    scrollMonitorActive = false;
    container.removeEventListener('scroll', handleScrollEvent);

    console.log('\n🛑 Scroll monitor stopped');
    console.log('Total scroll events:', scrollEventCount);
  };

  function handleScrollEvent() {
    scrollEventCount++;
    const now = Date.now();
    const timeSinceLastScroll = now - lastScrollTime;
    lastScrollTime = now;

    const info = window.getScrollInfo();
    console.log(`Scroll Event #${scrollEventCount} (${timeSinceLastScroll}ms since last)`);
  }

  // Check if "Back to bottom" button is visible
  window.checkBackToBottomButton = function() {
    const button = document.querySelector('button[class*="absolute"][class*="bottom-4"][class*="right-4"]');
    
    if (button) {
      const isVisible = button.offsetParent !== null;
      console.log('🔘 "Back to bottom" button:', isVisible ? '✅ VISIBLE' : '❌ HIDDEN');
      return isVisible;
    } else {
      console.log('⚠️ Could not find "Back to bottom" button');
      return null;
    }
  };

  // Run all checks
  window.runAllChecks = function() {
    console.log('🔍 Running All Checks');
    console.log('=====================================\n');

    window.getScrollInfo();
    window.checkBackToBottomButton();

    console.log('\n✅ All checks complete!');
  };

  // Performance test
  window.testScrollPerformance = function(duration = 5000) {
    console.log('⚡ Testing Scroll Performance');
    console.log(`Duration: ${duration}ms`);
    console.log('Scroll up and down rapidly...\n');

    const container = getScrollContainer();
    if (!container) return;

    let eventCount = 0;
    let totalTime = 0;
    let maxTime = 0;
    const times = [];

    const handler = () => {
      const start = performance.now();
      
      // Simulate the handleScroll logic
      const threshold = 100;
      const atBottomNow = container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
      
      const end = performance.now();
      const executionTime = end - start;
      
      eventCount++;
      totalTime += executionTime;
      maxTime = Math.max(maxTime, executionTime);
      times.push(executionTime);
    };

    container.addEventListener('scroll', handler);

    setTimeout(() => {
      container.removeEventListener('scroll', handler);

      const avgTime = totalTime / eventCount;
      times.sort((a, b) => a - b);
      const medianTime = times[Math.floor(times.length / 2)];

      console.log('\n📊 Performance Results:');
      console.log('  Total events:', eventCount);
      console.log('  Average time:', avgTime.toFixed(3) + 'ms');
      console.log('  Median time:', medianTime.toFixed(3) + 'ms');
      console.log('  Max time:', maxTime.toFixed(3) + 'ms');
      console.log('  Target: < 16ms (60fps)');
      console.log('  Status:', maxTime < 16 ? '✅ PASS' : '❌ FAIL');
    }, duration);
  };

  // Print help
  window.scrollTestHelp = function() {
    console.log('📚 Available Test Commands:');
    console.log('=====================================');
    console.log('');
    console.log('Basic Commands:');
    console.log('  getScrollInfo()           - Show current scroll position and status');
    console.log('  scrollToBottom()          - Scroll to bottom (smooth)');
    console.log('  scrollToTop()             - Scroll to top (smooth)');
    console.log('  scrollToDistance(px)      - Scroll to specific distance from bottom');
    console.log('  checkBackToBottomButton() - Check if button is visible');
    console.log('  runAllChecks()            - Run all checks at once');
    console.log('');
    console.log('Testing Commands:');
    console.log('  testThreshold()           - Test 100px threshold boundary');
    console.log('  testScrollPerformance()   - Test scroll event performance');
    console.log('  startScrollMonitor()      - Start monitoring scroll events');
    console.log('  stopScrollMonitor()       - Stop monitoring scroll events');
    console.log('');
    console.log('Examples:');
    console.log('  scrollToDistance(99)      - Scroll to 99px from bottom (should enable auto-scroll)');
    console.log('  scrollToDistance(101)     - Scroll to 101px from bottom (should disable auto-scroll)');
    console.log('  testThreshold()           - Automatically test threshold boundaries');
    console.log('');
  };

  // Auto-run help on load
  window.scrollTestHelp();

  console.log('\n✅ Test helper ready! Type scrollTestHelp() to see commands again.\n');
})();
