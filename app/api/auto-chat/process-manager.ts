// 存储运行中的自动聊天进程
// 每个用户（email）只能有一个活跃的自动聊天进程
export const runningProcesses = new Map<string, {
  pid: number;
  email: string;
  startTime: Date;
}>();

/**
 * 添加或更新用户的进程记录
 * 如果用户已有进程，会覆盖（每个用户只允许一个进程）
 */
export function addProcess(email: string, pid: number) {
  const existing = runningProcesses.get(email);
  if (existing) {
    console.log(`[Process Manager] Replacing existing process ${existing.pid} with ${pid} for ${email}`);
  }
  
  runningProcesses.set(email, {
    pid,
    email,
    startTime: new Date()
  });
  console.log(`[Process Manager] Added process for ${email}, PID: ${pid}, Total processes: ${runningProcesses.size}`);
}

/**
 * 移除用户的进程记录
 */
export function removeProcess(email: string) {
  const removed = runningProcesses.delete(email);
  if (removed) {
    console.log(`[Process Manager] Removed process for ${email}, Remaining: ${runningProcesses.size}`);
  }
  return removed;
}

/**
 * 获取指定用户的进程信息
 */
export function getProcess(email: string) {
  return runningProcesses.get(email);
}

/**
 * 获取所有运行中的进程（仅用于调试和监控）
 */
export function getAllProcesses() {
  return Array.from(runningProcesses.values());
}
