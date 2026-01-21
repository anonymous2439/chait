import * as vscode from 'vscode';
import WebSocket from 'ws';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    const provider = new MyPanelViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'myPanel.view',
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
            }
        )
    );
}

export function deactivate() {}

class MyPanelViewProvider implements vscode.WebviewViewProvider {
    private webviewView?: vscode.WebviewView;

    // 🔹 Sockets
    private chatSocket?: WebSocket;
    private gameSocket?: WebSocket;

    private unread_count = 0;
    private default_chat_ws_url = 'ws://45.77.242.28/api/chat/ws/439';
    private default_game_ws_url = 'ws://45.77.242.28/karirs/';

    constructor(private readonly extensionUri: vscode.Uri) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this.webviewView = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.getHtml();

        // Connect sockets
        this.connectChatSocket(this.default_chat_ws_url);
        this.connectGameSocket(this.default_game_ws_url);

        // Reset unread counter when tab becomes visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.unread_count = 0;
                this.updateBadge();
            }
        });

        webviewView.webview.onDidReceiveMessage((msg) => {
            if (msg.type === 'chat') {
                this.chatSocket?.send(JSON.stringify(msg.data));
            }

            if (msg.type === 'switchSession') {
                this.connectChatSocket(msg.url); // ONLY chat socket switches
            }

            if (msg.type === 'karirs') {
                this.gameSocket?.send(JSON.stringify(msg.data));
            }
        });
    }

    // -----------------------------
    // 🔹 CHAT SOCKET (dynamic)
    // -----------------------------
    private connectChatSocket(url: string) {
        if (this.chatSocket) {
            this.chatSocket.removeAllListeners();
            this.chatSocket.close();
        }

        this.chatSocket = new WebSocket(url);

        this.chatSocket.on('open', () => {
            console.log('Chat WebSocket connected:', url);
        });

        this.chatSocket.on('close', () => console.log('Chat WebSocket closed:', url));
        this.chatSocket.on('error', (err) => console.error('Chat WebSocket error:', err));

        this.chatSocket.on('message', (data) => {
            if (this.webviewView) {
                this.webviewView.webview.postMessage({
                    type: 'wsMessage',
                    data: data.toString(),
                });

                if (!this.webviewView.visible) {
                    this.unread_count++;
                    this.updateBadge();
                } else {
                    this.unread_count = 0;
                    this.updateBadge();
                }
            }
        });
    }

    // -----------------------------
    // 🔹 GAME SOCKET (fixed)
    // -----------------------------
    private connectGameSocket(url: string) {
        if (this.gameSocket) {
            this.gameSocket.removeAllListeners();
            this.gameSocket.close();
        }

        this.gameSocket = new WebSocket(url);

        this.gameSocket.on('open', () => {
            console.log('Game WebSocket connected:', url);
        });

        this.gameSocket.on('close', () => console.log('Game WebSocket closed:', url));
        this.gameSocket.on('error', (err) => console.error('Game WebSocket error:', err));

        this.gameSocket.on('message', (data) => {
            if (this.webviewView) {
                this.webviewView.webview.postMessage({
                    type: 'karirs',
                    data: data.toString(),
                });
            }
        });
    }

    private updateBadge() {
        if (!this.webviewView) return;

        this.webviewView.badge = {
            value: this.unread_count,
            tooltip: `${this.unread_count} unread messages`,
        };
    }

    private getHtml(): string {
        const html_path = vscode.Uri.joinPath(this.extensionUri, 'media', 'chat.html');
        const css_path = vscode.Uri.joinPath(this.extensionUri, 'media', 'chat.css');
        const js_path = vscode.Uri.joinPath(this.extensionUri, 'media', 'chat.js');

        const html = fs.readFileSync(html_path.fsPath, 'utf8');

        const cssUri = this.webviewView!.webview.asWebviewUri(css_path);
        const scriptUri = this.webviewView!.webview.asWebviewUri(js_path);

        return html
            .replace('{{styleUri}}', cssUri.toString())
            .replace('{{scriptUri}}', scriptUri.toString());
    }
}
