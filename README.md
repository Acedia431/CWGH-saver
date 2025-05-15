# CWGH-saver

Userscript for tampermonkey. Adds a "Save to GitHub" button to the bottom panel of the CodeWars kata. Also adds a "Settings" button to the bottom panel for configuring.

Saves everything to the specified GitHub repository:
- The solution is saved in the file solution.<language>.
- The task description and metadata are in the README.md.

## How to use?

1. Create a new Tampermonkey script and paste the contents of the file [CWGH saver.js](CWGH%20saver.js) into it.
2. Go to Settings and fill in the required fields:
  - Personal Access Token (with repo permissions).
  - Username.
  - Repository name.
  - Branch (if needed).
3. Now, when you want to save to the repository, click the 'Save to GitHub' button.

![Example](/images/example.gif)
