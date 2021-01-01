// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import path = require("path");
import fs = require("fs");

interface Template
{
	args : string[],
	code : string
}

interface ITemplateDictionary
{
	[index:string] : Template
}

let templates : ITemplateDictionary;
let templateNames : string[];

let templatePath = path.resolve(__dirname, "..", "assets", "templates.json");

function Init(prompt = true)
{
	console.log(templatePath.toString());
	fs.readFile(templatePath, (err, data) =>
	{
		if (err)
		{
			vscode.window.showErrorMessage(err.message);
			return;
		}
		templates = JSON.parse(data.toString());
		templateNames = Object.keys(templates).sort();
	});
	if (prompt)
		vscode.window.showInformationMessage("Database successfully updated.");
}

async function Update()
{
	fs.writeFile(templatePath, JSON.stringify(templates, null, '\t'), () => 
	{
		Init();
	});
}

function ReplaceAll(s : string, oldString : string, newString : string) : string
{
	return s.split(oldString).join(newString);
}

function Escape(s : string)
{
	s = ReplaceAll(s, "\n", "\\n");
	s = ReplaceAll(s, "\t", "\\t");
	return s;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	Init(false);
	context.subscriptions.push
	(
		vscode.commands.registerCommand("templator.insertTemplate", async () =>
		{
			if (templates == undefined) Init(false);
			let s = await vscode.window.showQuickPick(templateNames, {canPickMany : false}) ?? "";
			if (s == "")
			{
				vscode.window.showErrorMessage("Please enter a name.");
				return;
			}
			if (templates[s] == undefined)
			{
				vscode.window.showErrorMessage("No template exists.");
				return;
			}
			let code = templates[s].code;
			for (let i = 0; i < templates[s].args.length; ++i)
			{
				let name = templates[s].args[i];
				let arg = await vscode.window.showInputBox({prompt : "Type in a value for argument \"" + name + "\""}) ?? "";
				if (arg == "")
				{
					vscode.window.showErrorMessage("Invalid template argument.");
					return;
				}
				code = ReplaceAll(code, "!@#" + name, arg);
			}
			vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(code), vscode.window.activeTextEditor.selection.start);
		})
	);
	context.subscriptions.push
	(
		vscode.commands.registerCommand("templator.editTemplates", () =>
		{
			vscode.workspace.openTextDocument(vscode.Uri.file(templatePath)).then((doc) =>
			{
				vscode.window.showTextDocument(doc);
			});
		})
	);
	context.subscriptions.push
	(
		vscode.commands.registerCommand("templator.addTemplate", async () =>
		{
			let editor = vscode.window.activeTextEditor;
			let s = editor?.document.getText(editor.selection);
			if ((s === undefined) || (s == null) || (s == ""))
			{
				vscode.window.showErrorMessage("Please select some code.");
				return;
			}

			let numstring = await vscode.window.showInputBox({prompt: "Enter number of template parameters"});
			if (numstring === undefined)
			{
				vscode.window.showErrorMessage("Invalid number.");
				return;
			}
			let count = Number.parseInt(numstring) ?? -1;
			if (count == -1)
			{
				vscode.window.showErrorMessage("Invalid number.");
				return;
			}
			let names = new Array<string>();
			for (let i = 1; i <= count; ++i)
			{
				let str = await vscode.window.showInputBox({prompt: "Enter parameter #" + i.toString()}) ?? "";
				if (str == "")
				{
					vscode.window.showErrorMessage("Invalid template parameter.");
					return;
				}
				names.push(str);
			}

			let templateName = await vscode.window.showInputBox({prompt: "Enter template name"}) ?? "";
			
			if (templateName == "")
			{
				vscode.window.showErrorMessage("Invalid template name.");
				return;
			}

			let current = templates[templateName];

			let good = ((current == (current ?? ""))) ?
				(await vscode.window.showQuickPick(["Yes", "No"], {placeHolder: "Template already exists. Continue and overwrite?"})) == "Yes" :
				true;
			
			if (!good) return;
			
			templates[templateName] = {args: names, code: s};
			Update().then(() => vscode.window.showInformationMessage("Template successfully created."));
		})
	);
	context.subscriptions.push
	(
		vscode.commands.registerCommand("templator.reloadDatabase", Init)
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
