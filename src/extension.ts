import {languages, window, workspace, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem} from 'vscode';

export function activate(context: ExtensionContext) {
	console.log('StatusBarExtensions activated');

	let statusBarDiagnosticError = new StatusBarDiagnosticError();
	let statusBarLinesInfo = new StatusBarLinesInfo();

	context.subscriptions.push(statusBarDiagnosticError);
	context.subscriptions.push(statusBarLinesInfo);
}

function promptToReloadWindow() {	
	const action = 'Reload';

	window
	.showInformationMessage(
		`Reload window in order for change in extension Status Bar Extensions configuration to take effect.`,
		action
	)
	.then(selectedAction => {
		if (selectedAction === action) {
		commands.executeCommand('workbench.action.reloadWindow');
		}
	});
}

export class StatusBarDiagnosticError {
	private statusBarItem: StatusBarItem;
	private diagnosticErrors: { [x: string]: any; };
    private disposable: Disposable;

    constructor() {
		this.diagnosticErrors = {};
		this.statusBarItem = this.createStatusBarItem();

		let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this.updateDiagnosticErrors, this, subscriptions);
		window.onDidChangeActiveTextEditor(this.updateDiagnosticErrors, this, subscriptions);
		languages.onDidChangeDiagnostics(this.updateIssueErrors, this, subscriptions);
		workspace.onDidChangeConfiguration(this.onConfigurationChange, this, subscriptions);

        this.disposable = Disposable.from(...subscriptions);
	}

	private onConfigurationChange(event: any) {
		if (event.affectsConfiguration('statusBarExtensions.diagnosticErrorAlignment') ||
			event.affectsConfiguration('statusBarExtensions.diagnosticErrorPriority')) {
			// console.log(event.affectsConfiguration('statusBarExtensions.linesInfoPriority'), event.affectsConfiguration('statusBarExtensions.linesInfoPriority'));
			promptToReloadWindow();
        }
	}

	private createStatusBarItem() {
		let settings = workspace.getConfiguration('statusBarExtensions');
		let alignment = settings.get('diagnosticErrorAlignment') === 'right' ? StatusBarAlignment.Right : StatusBarAlignment.Left;
		let priority: number = settings.get('diagnosticErrorPriority') || 0;

		return window.createStatusBarItem(alignment, priority);
	}

	private updateIssueErrors(diagnostic: { uris: any; }) {
		for (const uri of diagnostic.uris) {
			let issues = languages.getDiagnostics(uri);
			const issuesDescriptions = issues.map((e) => {
				return {
					line: e.range.start.line,
					severity: e.severity,
					source: e.source || '',
					message: e.message,
				};
			});

			this.diagnosticErrors[uri.path] = issuesDescriptions;
		}
	}
	
	private updateDiagnosticErrors() {
		this.statusBarItem.hide();

        let editor = window.activeTextEditor;
		let settings = workspace.getConfiguration('statusBarExtensions');
        if (!editor || !settings.get('diagnosticErrorEnabled')) {
            return;
		}

		let currentUri = editor.document.uri.path;
		let currentLine = editor.selection.active.line;
		
		const diagnosticErrors = this.diagnosticErrors[currentUri];
		if (!!diagnosticErrors) {
			const diagnosticError = diagnosticErrors.find((elem: any) => elem.line === currentLine);
			if (!!diagnosticError) {
				switch (diagnosticError.severity) {
					case 0:
						// error
						this.statusBarItem.text = `☢ (${diagnosticError.source}) ${diagnosticError.message}`;
						break;
					case 1:
						// warning
						this.statusBarItem.text = `⚠ (${diagnosticError.source}) ${diagnosticError.message}`;
						break;
					case 2:
						// info
						this.statusBarItem.text = `ℹ (${diagnosticError.source}) ${diagnosticError.message}`;
						break;
					case 3:
						// hint
						this.statusBarItem.text = `! (${diagnosticError.source}) ${diagnosticError.message}`;
						break;
					default:
						this.statusBarItem.text = `(${diagnosticError.source}) ${diagnosticError.message}`;
						break;
				}
				this.statusBarItem.show();
			}
		}
	}

    public dispose() {
        this.disposable.dispose();
    }
}


export class StatusBarLinesInfo {
	private statusBarItem: StatusBarItem;
    private disposable: Disposable;

    constructor() {
		this.statusBarItem = this.createStatusBarItem();

		let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this.updateTotalLines, this, subscriptions);
		window.onDidChangeActiveTextEditor(this.updateTotalLines, this, subscriptions);
		workspace.onDidChangeConfiguration(this.onConfigurationChange);

		this.updateTotalLines();

        this.disposable = Disposable.from(...subscriptions);
	}

	private onConfigurationChange(event: any) {
		if (event.affectsConfiguration('statusBarExtensions.linesInfoAlignment') ||
			event.affectsConfiguration('statusBarExtensions.linesInfoPriority')) {
			// console.log(event.affectsConfiguration('statusBarExtensions.linesInfoPriority'), event.affectsConfiguration('statusBarExtensions.linesInfoPriority'));
			promptToReloadWindow();
        }
	}

	private createStatusBarItem() {
		let settings = workspace.getConfiguration('statusBarExtensions');
		let alignment = settings.get('linesInfoAlignment') === 'right' ? StatusBarAlignment.Right : StatusBarAlignment.Left;
		let priority: number = settings.get('linesInfoPriority') || 0;

		console.log('lineslinfo', alignment, priority);
		return window.createStatusBarItem(alignment, priority);
	}

	private updateTotalLines() {
		this.statusBarItem.hide();

		let editor = window.activeTextEditor;
		let settings = workspace.getConfiguration('statusBarExtensions');
        if (!editor || !settings.get('linesInfoEnabled')) {
            return;
		}

		let currentLine = editor.selection.active.line + 1;
		let currentColumn = editor.selection.active.character + 1;
		let totalLines = editor.document.lineCount;
		this.statusBarItem.text = `Ln ${currentLine}/${totalLines}, ${currentColumn}`;
		this.statusBarItem.show();

	}
	
    public dispose() {
        this.disposable.dispose();
    }
}