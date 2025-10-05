import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, handleAuthError } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { spawn } from 'child_process'
import path from 'path'
import { addProcess, removeProcess, getProcess } from '../process-manager'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes timeout

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 验证用户身份
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return handleAuthError(auth.error!)
    }

    const { email } = auth.user!
    const data = await request.json()

    // 检查用户是否已有运行中的进程
    const existingProcess = getProcess(email)
    if (existingProcess) {
      console.log(`[Auto Chat] User ${email} already has a running process (PID: ${existingProcess.pid})`)
      return NextResponse.json({
        success: false,
        message: '您已有一个正在运行的自动聊天进程，请先停止后再启动新的',
        existingPid: existingProcess.pid,
        startTime: existingProcess.startTime
      }, { status: 409 })
    }

    // 获取请求参数
    console.log(`[Auto Chat] Starting new process for user: ${email}`)
    console.log("Request parameters:", data);

    return new Promise((resolve) => {
      const rootDir = process.cwd();
      const scriptPath = path.join(rootDir, 'scripts', 'auto_chat.py');
      
      console.log("\nPreparing to run Python script:");
      console.log(`Root directory: ${rootDir}`);
      console.log(`Script path: ${scriptPath}`);
      console.log(`User email: ${email}`);
      
      // 检查脚本文件是否存在
      const fs = require('fs');
      if (!fs.existsSync(scriptPath)) {
        console.error(`Error: Script file not found: ${scriptPath}`);
        resolve(NextResponse.json({
          success: false,
          message: 'Auto chat script not found',
          error: `Script file not found: ${scriptPath}`
        }, { status: 500 }));
        return;
      }
      
      // 构建命令行参数
      const args = [
        scriptPath,
        '--user-email', email,
        '--root-dir', rootDir,
        '--target-group', data.targetGroup,
        '--message-source', data.messageSource,
        '--min-interval', data.messageInterval.split('-')[0],
        '--max-interval', data.messageInterval.split('-')[1]
      ];

      if (data.isTopic) {
        args.push('--topic');
        args.push('--topic-id', data.topicId);
      }

      // 添加循环模式参数
      if (data.enableLoop) {
        args.push('--enable-loop');
      }

      console.log("\nCommand arguments:", args);

      // 创建进程
      console.log("Spawning Python process...");
      const pythonProcess = spawn('python3', ['-u', ...args], {  
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',  // 禁用输出缓冲
          PYTHONIOENCODING: 'utf-8'
        },
        detached: true  // 允许进程独立运行
      });
      
      // 保存进程ID
      if (pythonProcess.pid) {
        addProcess(email, pythonProcess.pid);
        console.log(`[Auto Chat] Started process ${pythonProcess.pid} for ${email}`);
      }

      let stdoutData = '';
      let stderrData = '';
      let processStarted = false;

      pythonProcess.stdout.on('data', (data) => {
        processStarted = true;
        const text = data.toString();
        stdoutData += text;
        console.log('Python stdout:', text);
        // 发送状态更新
        resolve(NextResponse.json({
          success: true,
          message: 'Auto chat process started successfully',
          data: text.trim()
        }));
      });

      pythonProcess.stderr.on('data', (data) => {
        processStarted = true;
        const text = data.toString();
        stderrData += text;
        console.error('Python stderr:', text);
        // 发送错误信息
        resolve(NextResponse.json({
          success: false,
          message: 'Auto chat process failed',
          error: text.trim()
        }));
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        resolve(NextResponse.json({
          success: false,
          message: 'Failed to start auto chat process',
          error: error.message,
          command: 'python',
          args: args
        }, { status: 500 }));
      });

      // 设置超时检查
      const timeout = setTimeout(() => {
        if (!processStarted) {
          console.error('Python process failed to start within timeout');
          pythonProcess.kill();
          resolve(NextResponse.json({
            success: false,
            message: 'Auto chat process failed to start within timeout',
            error: 'Process timeout',
            stdout: stdoutData,
            stderr: stderrData
          }, { status: 500 }));
        }
      }, 30000); 

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        console.log(`\nPython process exited with code ${code}`);
        console.log('Total stdout:', stdoutData);
        console.log('Total stderr:', stderrData);
        
        // 清理进程管理器
        removeProcess(email);
        console.log(`[Auto Chat] Process ${pythonProcess.pid} exited, removed from manager`);
        
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            message: 'Auto chat process started successfully'
          }));
        } else {
          // 尝试从输出中提取具体的错误信息
          const errorMessage = stderrData || stdoutData.split('\n').find(line => line.includes('Error:'));
          resolve(NextResponse.json({
            success: false,
            message: 'Auto chat process failed',
            error: errorMessage || 'Unknown error',
            stdout: stdoutData,
            stderr: stderrData,
            code,
            command: 'python',
            args: args,
            workingDirectory: process.cwd()
          }, { status: 500 }));
        }
      });
    });
  } catch (error: any) {
    console.error('Error in auto-chat/start:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
