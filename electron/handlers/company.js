import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export function registerCompanyHandlers({ ipcMain, getDb, dialog }) {
  // Get company information
  ipcMain.handle('get-company-info', async () => {
    try {
      const db = getDb();
      const company = db.prepare(`
        SELECT 
          id, company_name, tagline, address_line1, address_line2,
          city, state, pincode, country, phone, mobile, email, website,
          gstin, pan, cin, logo_path, footer_text,
          bank_name, bank_account_number, bank_ifsc, bank_branch,
          is_locked, updated_at, edit_pin,
          terms_1, terms_2, terms_3, terms_4, terms_5
        FROM company_info WHERE id = 1
      `).get();

      // If logo_path exists, convert to absolute path
      if (company && company.logo_path) {
        const userDataPath = app.getPath('userData');
        const logoDir = path.join(userDataPath, 'company_assets');
        const absoluteLogoPath = path.join(logoDir, company.logo_path);
        
        // Check if file exists
        if (fs.existsSync(absoluteLogoPath)) {
          company.logo_path = absoluteLogoPath;
        } else {
          company.logo_path = null;
        }
      }

      return { success: true, data: company };
    } catch (error) {
      console.error('Error getting company info:', error);
      return { success: false, message: error.message };
    }
  });

  // Verify company edit PIN
  ipcMain.handle('verify-company-pin', async (event, pin) => {
    try {
      const db = getDb();
      const company = db.prepare('SELECT edit_pin FROM company_info WHERE id = 1').get();
      
      if (!company) {
        return { success: false, message: 'Company info not found' };
      }

      // If no PIN is set, allow access
      if (!company.edit_pin || company.edit_pin.trim() === '') {
        return { success: true };
      }

      const isValid = await bcrypt.compare(pin, company.edit_pin);
      return { success: isValid };
    } catch (error) {
      console.error('Error verifying company PIN:', error);
      return { success: false, message: error.message };
    }
  });

  // Update company information (requires PIN verification first)
  ipcMain.handle('update-company-info', async (event, { pin, companyData }) => {
    try {
      const db = getDb();
      
      // Verify PIN first
      const company = db.prepare('SELECT edit_pin, is_locked FROM company_info WHERE id = 1').get();
      
      if (!company) {
        return { success: false, message: 'Company info not found' };
      }

      if (company.is_locked && company.edit_pin && company.edit_pin.trim() !== '') {
        const isValidPin = await bcrypt.compare(pin, company.edit_pin);
        if (!isValidPin) {
          return { success: false, message: 'Invalid PIN' };
        }
      }

      // Update company information
      const updateStmt = db.prepare(`
        UPDATE company_info SET
          company_name = ?,
          tagline = ?,
          address_line1 = ?,
          address_line2 = ?,
          city = ?,
          state = ?,
          pincode = ?,
          country = ?,
          phone = ?,
          mobile = ?,
          email = ?,
          website = ?,
          gstin = ?,
          pan = ?,
          cin = ?,
          footer_text = ?,
          bank_name = ?,
          bank_account_number = ?,
          bank_ifsc = ?,
          bank_branch = ?,
          terms_1 = ?,
          terms_2 = ?,
          terms_3 = ?,
          terms_4 = ?,
          terms_5 = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `);

      updateStmt.run(
        companyData.company_name,
        companyData.tagline,
        companyData.address_line1,
        companyData.address_line2,
        companyData.city,
        companyData.state,
        companyData.pincode,
        companyData.country,
        companyData.phone,
        companyData.mobile,
        companyData.email,
        companyData.website,
        companyData.gstin,
        companyData.pan,
        companyData.cin,
        companyData.footer_text,
        companyData.bank_name,
        companyData.bank_account_number,
        companyData.bank_ifsc,
        companyData.bank_branch,
        companyData.terms_1 || '',
        companyData.terms_2 || '',
        companyData.terms_3 || '',
        companyData.terms_4 || '',
        companyData.terms_5 || ''
      );

      return { success: true, message: 'Company information updated successfully' };
    } catch (error) {
      console.error('Error updating company info:', error);
      return { success: false, message: error.message };
    }
  });

  // Change company edit PIN (requires current PIN only if PIN exists)
  ipcMain.handle('change-company-pin', async (event, { currentPin, newPin }) => {
    try {
      const db = getDb();
      
      // Get current PIN
      const company = db.prepare('SELECT edit_pin FROM company_info WHERE id = 1').get();
      
      if (!company) {
        return { success: false, message: 'Company info not found' };
      }

      // Check if PIN exists (not empty or null)
      const pinExists = company.edit_pin && company.edit_pin.trim() !== '';

      // If PIN exists, verify current PIN
      if (pinExists) {
        if (!currentPin || currentPin.trim() === '') {
          return { success: false, message: 'Current PIN is required' };
        }

        const isValidPin = await bcrypt.compare(currentPin, company.edit_pin);
        if (!isValidPin) {
          return { success: false, message: 'Current PIN is incorrect' };
        }
      }

      // Validate new PIN
      if (!newPin || newPin.length < 6) {
        return { success: false, message: 'New PIN must be at least 6 characters' };
      }

      // Hash new PIN
      const hashedNewPin = await bcrypt.hash(newPin, 10);

      // Update PIN
      db.prepare('UPDATE company_info SET edit_pin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
        .run(hashedNewPin);

      return { 
        success: true, 
        message: pinExists ? 'PIN changed successfully' : 'PIN set successfully' 
      };
    } catch (error) {
      console.error('Error changing company PIN:', error);
      return { success: false, message: error.message };
    }
  });

  // Toggle company info lock
  ipcMain.handle('toggle-company-lock', async (event, { pin, locked }) => {
    try {
      const db = getDb();
      
      // Verify PIN
      const company = db.prepare('SELECT edit_pin FROM company_info WHERE id = 1').get();
      
      if (!company) {
        return { success: false, message: 'Company info not found' };
      }

      if (company.edit_pin && company.edit_pin.trim() !== '') {
        const isValidPin = await bcrypt.compare(pin, company.edit_pin);
        if (!isValidPin) {
          return { success: false, message: 'Invalid PIN' };
        }
      }

      // Toggle lock
      db.prepare('UPDATE company_info SET is_locked = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
        .run(locked ? 1 : 0);

      return { success: true, message: `Company info ${locked ? 'locked' : 'unlocked'} successfully` };
    } catch (error) {
      console.error('Error toggling company lock:', error);
      return { success: false, message: error.message };
    }
  });

  // Upload company logo with file picker
  ipcMain.handle('upload-company-logo', async (event, { pin }) => {
    try {
      const db = getDb();
      
      // Verify PIN
      const company = db.prepare('SELECT edit_pin, is_locked, logo_path FROM company_info WHERE id = 1').get();
      
      if (!company) {
        return { success: false, message: 'Company info not found' };
      }

      if (company.is_locked && company.edit_pin && company.edit_pin.trim() !== '') {
        const isValidPin = await bcrypt.compare(pin, company.edit_pin);
        if (!isValidPin) {
          return { success: false, message: 'Invalid PIN' };
        }
      }

      // Open file dialog
      const result = await dialog.showOpenDialog({
        title: 'Select Company Logo',
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths.length) {
        return { success: false, message: 'No file selected' };
      }

      const sourcePath = result.filePaths[0];
      const fileExt = path.extname(sourcePath);
      
      // Create company_assets directory in userData
      const userDataPath = app.getPath('userData');
      const logoDir = path.join(userDataPath, 'company_assets');
      
      if (!fs.existsSync(logoDir)) {
        fs.mkdirSync(logoDir, { recursive: true });
      }

      // Delete old logo if exists
      if (company.logo_path) {
        const oldLogoPath = path.join(logoDir, company.logo_path);
        if (fs.existsSync(oldLogoPath)) {
          try {
            fs.unlinkSync(oldLogoPath);
          } catch (err) {
            console.warn('Could not delete old logo:', err);
          }
        }
      }

      // Generate new filename (company_logo with extension)
      const newFileName = `company_logo${fileExt}`;
      const destinationPath = path.join(logoDir, newFileName);

      // Copy file to destination
      fs.copyFileSync(sourcePath, destinationPath);

      // Update database with relative path (just filename)
      db.prepare('UPDATE company_info SET logo_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
        .run(newFileName);

      return { 
        success: true, 
        message: 'Logo uploaded successfully',
        logoPath: destinationPath
      };
    } catch (error) {
      console.error('Error uploading logo:', error);
      return { success: false, message: error.message };
    }
  });

  // Remove company logo
  ipcMain.handle('remove-company-logo', async (event, { pin }) => {
    try {
      const db = getDb();
      
      // Verify PIN
      const company = db.prepare('SELECT edit_pin, is_locked, logo_path FROM company_info WHERE id = 1').get();
      
      if (!company) {
        return { success: false, message: 'Company info not found' };
      }

      if (company.is_locked && company.edit_pin && company.edit_pin.trim() !== '') {
        const isValidPin = await bcrypt.compare(pin, company.edit_pin);
        if (!isValidPin) {
          return { success: false, message: 'Invalid PIN' };
        }
      }

      // Delete logo file if exists
      if (company.logo_path) {
        const userDataPath = app.getPath('userData');
        const logoDir = path.join(userDataPath, 'company_assets');
        const logoPath = path.join(logoDir, company.logo_path);
        
        if (fs.existsSync(logoPath)) {
          fs.unlinkSync(logoPath);
        }
      }

      // Update database
      db.prepare('UPDATE company_info SET logo_path = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
        .run();

      return { success: true, message: 'Logo removed successfully' };
    } catch (error) {
      console.error('Error removing logo:', error);
      return { success: false, message: error.message };
    }
  });

  // Get default company logo path
  ipcMain.handle('get-default-logo-path', async () => {
    try {
      // Return path to default logo in app resources
      const defaultLogoPath = path.join(__dirname, '..', 'assets', 'default-company-logo.png');
      return { success: true, path: defaultLogoPath };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });





  // Get logo as base64
ipcMain.handle('get-logo-as-base64', async (event, logoPath) => {
  try {
    if (!logoPath || !fs.existsSync(logoPath)) {
      return { success: false, message: 'Logo file not found' };
    }

    // Read file and convert to base64
    const fileBuffer = fs.readFileSync(logoPath);
    const base64 = fileBuffer.toString('base64');
    const ext = path.extname(logoPath).toLowerCase();
    
    // Determine MIME type
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.bmp') mimeType = 'image/bmp';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.svg') mimeType = 'image/svg+xml';
    
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    return { success: true, dataUrl };
  } catch (error) {
    console.error('Error reading logo as base64:', error);
    return { success: false, message: error.message };
  }
});
}