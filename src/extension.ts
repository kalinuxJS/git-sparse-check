import * as vscode from 'vscode';
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';

export function activate(context: vscode.ExtensionContext) {

	console.log('恭喜，你的扩展插件激活了');

	const disposable = vscode.commands.registerCommand('git-sparse-check.gitSparse', async () => {
		// 弹出消息框
		vscode.window.showInformationMessage('开始稀疏检出');
		const uri = await vscode.window.showOpenDialog({
			canSelectMany: false,
			openLabel: '选择下载后保存的目标文件夹',
			canSelectFiles: false,
			canSelectFolders: true
		});
		// 弹出框输入远程git地址
		const gitRepoUrl = await vscode.window.showInputBox({
			prompt: '请输入git地址',
			placeHolder: 'https'
		});
		// 获取要拉取的分支
		const branchName = await vscode.window.showInputBox({
			prompt: '请输入分支名称',
			placeHolder: 'e.g: wenzhou'
		});
		// 获取要下载的文件
		const checkoutPaths = await vscode.window.showInputBox({
			prompt: '请输入拉取文件夹路径',
			placeHolder: 'e.g: web-search,hb-fed'
		});
		// 执行拉取代码命令
		if (uri && uri[0] && gitRepoUrl && checkoutPaths) {
			const newProjectName = path.basename(gitRepoUrl).split('.')[0];
			// 初始化项目文件夹 xxx/web-search
			const folderUri = vscode.Uri.joinPath(uri[0], `/${newProjectName}`);
			// 进入文件夹并初始化git init
			if (!fs.existsSync(folderUri.fsPath)) {
				try {
					fs.mkdirSync(folderUri.fsPath, { recursive: true })
				} catch (err) {
					vscode.window.showErrorMessage(`创建文件夹${newProjectName}失败：${err}`)
				}
			}
			const gitInit = spawn('git', ['init'], {
				cwd: folderUri.fsPath,
				stdio: 'inherit'
			});
			await new Promise((resolve, reject) => {
				gitInit.on('close', (code) => {
					if (code === 0) {
						resolve('init成功');
					} else {
						reject();
						vscode.window.showErrorMessage('初始化.git失败');
					}
				});
				gitInit.on('error', (err) => {
					vscode.window.showErrorMessage(`初始化.git失败: ${err.message}`);
					reject();
				});
			});

			// 连接远程git仓库
			const remoteAdd = spawn('git', ['remote', 'add', '-f', 'origin', `${gitRepoUrl}`], { cwd: folderUri.fsPath, stdio: 'inherit' });
			await new Promise((resolve, reject) => {
				remoteAdd.on('close', (code) => {
					if (code === 0) {
						resolve('');
					} else {
						reject(new Error('远程连接失败'));
					}
				});
			});

			// 启用稀疏检出
			const configSparse = spawn('git', ['config', 'core.sparseCheckout', 'true'], { cwd: folderUri.fsPath, stdio: 'inherit' });
			await new Promise((resolve, reject) => {
				configSparse.on('close', (code) => {
					if (code === 0) {
						resolve('');
					} else {
						reject(new Error('稀疏检出失败'));
					}
				});
			});

			// 创建.git/info/sparse-checkout文件
			const sparseCheckoutPath = path.join(folderUri.fsPath, '.git', 'info', 'sparse-checkout');
			if (!fs.existsSync(sparseCheckoutPath)) {
				try {
					const paths = checkoutPaths.split(',').map(item => item.trim());
					let text = ''
					for (const path of paths) {
						text += `/${path}\n`;
					}
					fs.writeFileSync(sparseCheckoutPath, text);
					vscode.window.showInformationMessage('创建parse-checkout成功')
				} catch (err) {
					vscode.window.showErrorMessage(`创建文件.git/info/sparse-checkout失败：${err}`)
				}
			}

			// 拉取代码
			const clone = spawn('git', ['pull', 'origin', `${branchName}`], { cwd: folderUri.fsPath, stdio: 'inherit' });
			await new Promise((resolve, reject) => {
				clone.on('close', (code) => {
					if (code === 0) {
						resolve('');
						vscode.window.showInformationMessage('克隆成功')
					} else {
						reject(new Error('克隆失败'));
						vscode.window.showErrorMessage('克隆失败了')
					}
				});
			});
		}

	});
	context.subscriptions.push(disposable);
}

export function deactivate() { }
