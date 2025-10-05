import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { verifyAuth, handleAuthError } from '@/lib/auth';
import { getProcess, removeProcess, getAllProcesses } from '../process-manager';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log('Stopping auto chat process...');

    // 验证用户身份
    const auth = await verifyAuth(request);
    if (!auth.success) {
      return handleAuthError(auth.error!);
    }

    const { email } = auth.user!;
    const isWindows = process.platform === 'win32';
    const killedProcesses = [];
    const errors = [];

    console.log(`[Stop] Attempting to stop auto chat for user: ${email}`);
    console.log(`[Stop] Platform: ${isWindows ? 'Windows' : 'macOS/Linux'}`);
    
    // 首先尝试使用保存的进程ID
    const processInfo = getProcess(email);
    console.log(`[Stop] Process manager lookup result:`, processInfo ? `PID ${processInfo.pid}` : 'Not found');
    
    if (processInfo) {
      try {
        console.log(`[Stop] Found saved process ${processInfo.pid} for ${email}`);
        if (isWindows) {
          await execAsync(`taskkill /F /PID ${processInfo.pid}`);
        } else {
          await execAsync(`kill -9 ${processInfo.pid}`);
        }
        killedProcesses.push(processInfo.pid.toString());
        removeProcess(email);
        console.log(`[Stop] Successfully killed process ${processInfo.pid}`);
      } catch (error: any) {
        console.error(`[Stop] Error killing saved process:`, error);
        errors.push(`Failed to kill process ${processInfo.pid}: ${error.message}`);
        // 继续尝试其他方法
      }
    } else {
      console.log(`[Stop] No saved process found, will search system processes`);
    }

    if (isWindows) {
      // Windows 系统
      const { stdout: tasklistOutput } = await execAsync('tasklist /FI "IMAGENAME eq python.exe" /FO CSV /NH');
      console.log('Tasklist output:', tasklistOutput);

      if (!tasklistOutput.includes('python.exe')) {
        console.log('No Python processes found');
        return NextResponse.json({
          success: true,
          message: 'No auto chat processes found to stop'
        });
      }

      const { stdout: wmicOutput } = await execAsync('wmic process where name="python.exe" get commandline,processid');
      console.log('WMIC output:', wmicOutput);

      const lines = wmicOutput.split('\n')
        .slice(1)
        .filter(line => line.trim())
        .filter(line => line.includes('auto_chat.py'));

      if (lines.length === 0) {
        console.log('No auto chat processes found');
        return NextResponse.json({
          success: true,
          message: 'No auto chat processes found to stop'
        });
      }

      for (const line of lines) {
        try {
          // 检查进程命令行是否包含当前用户的 email
          if (!line.includes(`--user-email ${email}`)) {
            console.log(`[Stop] Skipping process (not for user ${email})`);
            continue;
          }
          
          const pidMatch = line.match(/(\d+)\s*$/);
          if (pidMatch) {
            const pid = pidMatch[1];
            console.log(`[Stop] Killing user process ${pid} for ${email}...`);
            await execAsync(`taskkill /F /PID ${pid}`);
            killedProcesses.push(pid);
          }
        } catch (error: any) {
          console.error('Error killing process:', error);
          errors.push(error.message);
        }
      }
    } else {
      // macOS/Linux 系统  
      // 如果没有从管理器找到进程，尝试用 ps 查找
      if (killedProcesses.length === 0) {
        try {
          // 使用更宽泛的搜索模式
          const { stdout } = await execAsync('ps aux | grep "auto_chat.py" | grep -v grep');
          console.log('[Stop] PS output:', stdout);

        const lines = stdout.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
          console.log('No auto chat processes found');
          return NextResponse.json({
            success: true,
            message: 'No auto chat processes found to stop'
          });
        }

        for (const line of lines) {
          try {
            // 检查进程命令行是否包含当前用户的 email
            if (!line.includes(`--user-email ${email}`)) {
              console.log(`[Stop] Skipping process (not for user ${email}):`, line);
              continue;
            }
            
            const parts = line.trim().split(/\s+/);
            const pid = parts[1]; // PID is the second column
            console.log(`[Stop] Killing user process ${pid} for ${email}...`);
            await execAsync(`kill -9 ${pid}`);
            killedProcesses.push(pid);
          } catch (error: any) {
            console.error('Error killing process:', error);
            errors.push(error.message);
          }
        }
      } catch (error: any) {
        // ps命令没找到进程时会报错，这是正常的
        if (error.message.includes('Command failed')) {
          console.log('No auto chat processes found (ps returned empty)');
          return NextResponse.json({
            success: true,
            message: 'No auto chat processes found to stop'
          });
        }
        throw error;
      }
      }
    }

    if (killedProcesses.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Successfully stopped ${killedProcesses.length} auto chat process(es)`,
        killedProcesses,
        errors: errors.length > 0 ? errors : undefined
      });
    } else if (errors.length > 0) {
      throw new Error(`Failed to stop processes: ${errors.join(', ')}`);
    } else {
      return NextResponse.json({
        success: true,
        message: 'No matching auto chat processes found to stop'
      });
    }
  } catch (error: any) {
    console.error('Error in stop route:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to stop auto chat',
      error: error.message,
      stack: error.stack
    }, {
      status: 500
    });
  }
}
