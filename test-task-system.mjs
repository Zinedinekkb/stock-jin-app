// test-task-system.mjs
import assert from 'node:assert';
import { 
  matchesUserPosition, 
  isTaskDone, 
  isTaskCompletedToday, 
  DEFAULT_ROUTINE_TEMPLATES, 
  getTodayKey 
} from './app/services/taskService.js';

console.log('--- STARTING TASK SYSTEM UNIT TESTS ---');

const todayKey = getTodayKey();
console.log(`Current Thai Today Key: ${todayKey}`);

// -------------------------------------------------------------
// Test 1: Preset positions from TabMenu.js must match their tasks
// -------------------------------------------------------------
const presetEmployees = [
  { name: 'เชฟสมชาย', position: 'เชฟ / แม่ครัว', role: 'staff' },
  { name: 'ผู้ช่วยก้อง', position: 'ผู้ช่วยเชฟ', role: 'staff' },
  { name: 'น้องนก', position: 'พนักงานเสิร์ฟ', role: 'staff' },
  { name: 'แคชเชียร์ฝน', position: 'พนักงานแคชเชียร์', role: 'staff' },
  { name: 'พี่ชาญคุมสต็อก', position: 'พนักงานคุมสต็อก', role: 'staff' },
  { name: 'พี่บอส', position: 'ผู้จัดการร้าน', role: 'staff' },
  { name: 'แอดมินจิน', position: 'ผู้ดูแลระบบ', role: 'admin' },
];

console.log('\n[Test 1] Testing Preset Position Matching against DEFAULT_ROUTINE_TEMPLATES:');
for (const emp of presetEmployees) {
  const matchedTemplates = DEFAULT_ROUTINE_TEMPLATES.filter(t => matchesUserPosition(emp, t));
  console.log(`- ${emp.name} (${emp.position}, role: ${emp.role}): matched ${matchedTemplates.length} templates`);
  assert(matchedTemplates.length > 0, `FAIL: ${emp.position} must match at least 1 template!`);
}
console.log('✓ All preset employees successfully matched their respective routine tasks!');

// -------------------------------------------------------------
// Test 2: Negative matching (positions must not cross-contaminate)
// -------------------------------------------------------------
console.log('\n[Test 2] Testing Negative Matching:');
const chef = { name: 'เชฟเอ', position: 'เชฟ / แม่ครัว', role: 'staff' };
const financeTask = DEFAULT_ROUTINE_TEMPLATES.find(t => t.category === 'finance');
assert(!matchesUserPosition(chef, financeTask), 'Chef must NOT match finance task!');

const cashier = { name: 'แคชเชียร์บี', position: 'พนักงานแคชเชียร์', role: 'staff' };
const kitchenTask = DEFAULT_ROUTINE_TEMPLATES.find(t => t.category === 'kitchen');
assert(!matchesUserPosition(cashier, kitchenTask), 'Cashier must NOT match kitchen task!');
console.log('✓ Negative matching verified: departments do not leak tasks to other roles.');

// -------------------------------------------------------------
// Test 3: Direct User Assignment and All Staff Matching
// -------------------------------------------------------------
console.log('\n[Test 3] Testing Direct Assignment and All Staff:');
const targetUser = { uid: 'u123', name: 'นายเอ', position: 'พนักงานทั่วไป', role: 'staff' };
const otherUser = { uid: 'u999', name: 'นายบี', position: 'พนักงานทั่วไป', role: 'staff' };

const taskAssignedToUser = {
  id: 't1',
  title: 'งานพิเศษของนายเอ',
  targetType: 'user',
  targetUserId: 'u123',
};

assert(matchesUserPosition(targetUser, taskAssignedToUser), 'Should match target user');
assert(!matchesUserPosition(otherUser, taskAssignedToUser), 'Should NOT match other user');

const taskForAll = {
  id: 't2',
  title: 'ประชุมประจำสัปดาห์',
  targetType: 'all',
  targetPosition: 'ทุกคน',
};
assert(matchesUserPosition(targetUser, taskForAll), 'Should match all staff');
assert(matchesUserPosition(otherUser, taskForAll), 'Should match all staff');
console.log('✓ Direct user assignment and all-staff matching verified.');

// -------------------------------------------------------------
// Test 4: isTaskDone vs isTaskCompletedToday
// -------------------------------------------------------------
console.log('\n[Test 4] Testing isTaskDone and isTaskCompletedToday:');

// Routine task: completed today
const routineToday = {
  type: 'routine',
  isRoutine: true,
  status: 'completed',
  completedDates: { [todayKey]: { completedAt: Date.now() } }
};
assert.strictEqual(isTaskDone(routineToday, todayKey), true);
assert.strictEqual(isTaskCompletedToday(routineToday, todayKey), true);

// Routine task: completed yesterday only (e.g. 2026-09-24)
const routineYesterday = {
  type: 'routine',
  isRoutine: true,
  status: 'pending',
  completedDates: { '2026-09-24': { completedAt: Date.now() - 86400000 } }
};
assert.strictEqual(isTaskDone(routineYesterday, todayKey), false);
assert.strictEqual(isTaskCompletedToday(routineYesterday, todayKey), false);

// Assigned task: completed today
const assignedToday = {
  type: 'assigned',
  isRoutine: false,
  status: 'completed',
  completedAt: Date.now(),
  dueDate: todayKey,
};
assert.strictEqual(isTaskDone(assignedToday, todayKey), true);
assert.strictEqual(isTaskCompletedToday(assignedToday, todayKey), true);

// Assigned task: completed 5 days ago (should NOT count towards today's completed gauge!)
const fiveDaysAgoTs = Date.now() - (5 * 86400000);
const assignedPast = {
  type: 'assigned',
  isRoutine: false,
  status: 'completed',
  completedAt: fiveDaysAgoTs,
  dueDate: '2026-09-20',
};
assert.strictEqual(isTaskDone(assignedPast, todayKey), true, 'Is historically done');
assert.strictEqual(isTaskCompletedToday(assignedPast, todayKey), false, 'Must NOT be completed today');

console.log('✓ isTaskDone and isTaskCompletedToday behavior verified accurately.');

// -------------------------------------------------------------
// Test 5: Overdue detection
// -------------------------------------------------------------
console.log('\n[Test 5] Testing Overdue Detection:');
const pendingOverdue = {
  type: 'assigned',
  isRoutine: false,
  status: 'pending',
  dueDate: '2026-09-20', // past date
};
const isOverdue = !isTaskDone(pendingOverdue, todayKey) && pendingOverdue.dueDate < todayKey;
assert.strictEqual(isOverdue, true, 'Task due in the past must be detected as overdue');

const pendingToday = {
  type: 'assigned',
  isRoutine: false,
  status: 'pending',
  dueDate: todayKey,
};
const isTodayOverdue = !isTaskDone(pendingToday, todayKey) && pendingToday.dueDate < todayKey;
assert.strictEqual(isTodayOverdue, false, 'Task due today is NOT overdue');
console.log('✓ Overdue detection verified.');

console.log('\nALL UNIT TESTS PASSED SUCCESSFULLY! 🎉\n');
