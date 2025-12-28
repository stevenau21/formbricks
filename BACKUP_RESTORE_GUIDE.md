# Formbricks Backup & Restore Guide

This guide explains how to backup and restore your local Formbricks database and file uploads using the provided PowerShell scripts.

## 📋 Prerequisites

1.  **Docker Desktop** must be running.
2.  **PowerShell** (standard Windows terminal).
3.  You must be in the project directory: `C:\dev\projects\formbricks`.

---

## 💾 How to Backup

This creates a `.zip` file containing your database (forms, responses, users) and file uploads (images, etc.).

1.  Open PowerShell.
2.  Navigate to the project folder:
    ```powershell
    cd C:\dev\projects\formbricks
    ```
3.  Run the backup script:
    ```powershell
    .\backup-db.ps1
    ```

**Where is my backup?**
The script saves the backup in **two locations** for safety:
1.  `C:\dev\projects\formbricks\backups\`
2.  `C:\Users\<You>\Downloads\`

---

## ♻️ How to Restore

**Warning:** This will overwrite your current database with the backup.

1.  Open PowerShell.
2.  Navigate to the project folder:
    ```powershell
    cd C:\dev\projects\formbricks
    ```
3.  Run the restore script:
    ```powershell
    .\restore-db.ps1
    ```
4.  **Select a Backup:**
    - The script will list all backups found in your project folder and Downloads folder.
    - **Note:** You might see the same backup listed twice (once from `backups/` and once from `Downloads/`). This is normal. You can select either one.
    - Type the number (e.g., `0`) and press **Enter**.
5.  **Confirm:**
    - Type `y` and press **Enter** to start the restore.

---

## ❓ Troubleshooting

### "File cannot be loaded because running scripts is disabled..."
If you get a red error about "Execution Policy", run this command to allow the script to run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
```
Then try running the script again.

### "The term '.\backup-db.ps1' is not recognized..."
Make sure you include the `.\` at the start of the command.
- ❌ Wrong: `backup-db.ps1`
- ✅ Correct: `.\backup-db.ps1`

### "Why are there duplicate backups in the list?"
The restore script looks in both your **Downloads** folder and the **project backups** folder. Since the backup script saves a copy to both places, you will see the same file listed twice. They are identical, so you can choose either one.
