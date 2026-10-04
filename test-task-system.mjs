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
// -------------------------------------------------------------
// Test 6: Role & Department Tab Visibility
// -------------------------------------------------------------
console.log('\n[Test 6] Testing Department Tab Visibility (getVisiblePositionTabs & getUserCluster):');
import { getUserCluster, getVisiblePositionTabs, isTaskVisibleToUser } from './app/services/taskService.js';

const chefUser = { uid: 'chef_01', name: 'เชฟสมชาย', position: 'เชฟ / แม่ครัว', role: 'staff' };
const warehouseUser = { uid: 'wh_01', name: 'พี่ชาญ', position: 'พนักงานคุมสต็อก', role: 'staff' };
const cashierUser = { uid: 'cash_01', name: 'น้องฝน', position: 'แคชเชียร์', role: 'staff' };
const adminUser = { uid: 'admin_01', name: 'จิน', position: 'ผู้ดูแลระบบ', role: 'admin' };

assert.strictEqual(getUserCluster(chefUser), 'kitchen', 'Chef cluster must be kitchen');
assert.strictEqual(getUserCluster(warehouseUser), 'warehouse', 'Warehouse cluster must be warehouse');
assert.strictEqual(getUserCluster(cashierUser), 'finance', 'Cashier cluster must be finance');
assert.strictEqual(getUserCluster(adminUser), 'management', 'Admin cluster must be management');

const chefTabs = getVisiblePositionTabs(chefUser);
assert.strictEqual(chefTabs.length, 2, 'Chef should see only 2 tabs (my + kitchen)');
assert.deepStrictEqual(chefTabs.map(t => t.key), ['my', 'kitchen']);

const whTabs = getVisiblePositionTabs(warehouseUser);
assert.strictEqual(whTabs.length, 2, 'Warehouse should see only 2 tabs (my + warehouse)');
assert.deepStrictEqual(whTabs.map(t => t.key), ['my', 'warehouse']);

const adminTabs = getVisiblePositionTabs(adminUser);
assert.strictEqual(adminTabs.length, 8, 'Admin should see all 8 tabs');
console.log('✓ Tab visibility per role/department strictly enforced.');

// -------------------------------------------------------------
// Test 7: Task Visibility Filtering (isTaskVisibleToUser)
// -------------------------------------------------------------
console.log('\n[Test 7] Testing Task Visibility Filtering (isTaskVisibleToUser):');
const warehouseTask = {
  id: 'task_wh',
  title: 'นับสต็อกเปิดกะ',
  category: 'warehouse',
  targetDepartment: 'warehouse',
  targetPosition: 'เจ้าหน้าที่สต็อก',
  type: 'routine',
  isRoutine: true,
};

const kitchenTask2 = {
  id: 'task_kitchen',
  title: 'ตรวจเช็คอุณหภูมิตู้เย็น',
  category: 'kitchen',
  targetDepartment: 'kitchen',
  targetPosition: 'เชฟ / แม่ครัว',
  type: 'routine',
  isRoutine: true,
};

// Chef sees kitchen, but NEVER warehouse
assert.strictEqual(isTaskVisibleToUser(chefUser, kitchenTask2), true, 'Chef must see kitchen task');
assert.strictEqual(isTaskVisibleToUser(chefUser, warehouseTask), false, 'Chef must NOT see warehouse task');

// Warehouse staff sees warehouse, but NEVER kitchen
assert.strictEqual(isTaskVisibleToUser(warehouseUser, warehouseTask), true, 'Warehouse staff must see warehouse task');
assert.strictEqual(isTaskVisibleToUser(warehouseUser, kitchenTask2), false, 'Warehouse staff must NOT see kitchen task');

// Admin sees EVERYTHING
assert.strictEqual(isTaskVisibleToUser(adminUser, warehouseTask), true, 'Admin must see warehouse task');
assert.strictEqual(isTaskVisibleToUser(adminUser, kitchenTask2), true, 'Admin must see kitchen task');

// Directly assigned task is visible to assignee even if different department
const crossAssignedTask = {
  id: 'task_cross',
  title: 'ช่วยตรวจรับวัตถุดิบเข้าครัวด่วน',
  category: 'kitchen',
  targetType: 'user',
  targetUserId: 'wh_01', // assigned to warehouse staff
};
assert.strictEqual(isTaskVisibleToUser(warehouseUser, crossAssignedTask), true, 'Directly assigned task must be visible to target user');

console.log('✓ Task visibility filtering verified: regular staff only see their own & their team tasks, admin sees all.');

console.log('\nALL UNIT TESTS PASSED SUCCESSFULLY! 🎉\n');
