# Farts

It's a tool for adding scaffolding to newly created files depending on where they were created.

## Why this over CLI scaffolding tools?

Because the folder structure of JavaScript projects tend to not be different. CLIs require
you to:

- figure out the full path of where your new file is going go
- figure out which scaffold you're going to use
- leave your editor so that you can type the command into the console

## Using

```
npm install farts -g
farts ./src
```
