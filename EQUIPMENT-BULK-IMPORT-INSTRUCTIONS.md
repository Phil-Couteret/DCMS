# 📋 Equipment Bulk Import Template - Admin Instructions

**Purpose:** Import multiple equipment pieces into the DCMS system using CSV format  
**File:** `equipment-bulk-import-template.csv`  
**Location:** Equipment Management → Bulk Import

---

## 📊 **CSV Template Structure**

### **Required Columns:**

| Column | Description | Required | Example Values |
|--------|-------------|----------|----------------|
| **name** | Equipment name | ✅ Yes | "BCD Mares Avant Quattro" |
| **category** | Equipment category | ✅ Yes | "diving", "safety", "maintenance" |
| **type** | Equipment type | ✅ Yes | "BCD", "Regulator", "Mask", "Fins", "Wetsuit", "Semi-Dry" |
| **size** | Equipment size | ✅ Yes | "XS", "S", "M", "L", "XL", "XXL", "Standard" |
| **brand** | Manufacturer brand | ❌ Optional | "Mares", "Cressi", "Aqualung" |
| **model** | Equipment model | ❌ Optional | "Avant Quattro", "Pro Light", "Calypso" |
| **thickness** | Wetsuit thickness | ❌ Optional | "3mm", "5mm", "7mm" |
| **style** | Wetsuit style | ❌ Optional | "Shorty", "Full", "Semi-Dry" |
| **hood** | Has hood | ❌ Optional | "Yes", "No" |
| **serialNumber** | Unique serial number | ✅ Yes | "BCD-XS-001", "REG-001" |
| **condition** | Equipment condition | ✅ Yes | "excellent", "good", "fair", "poor" |
| **notes** | Additional notes | ❌ Optional | "New equipment", "Needs repair" |

---

## 🏷️ **Equipment Type Guidelines**

### **BCD (Buoyancy Control Device):**
- **Sizes:** XS, S, M, L, XL, XXL
- **Thickness:** Leave empty
- **Style:** Leave empty
- **Hood:** Leave empty
- **Example:** `BCD Mares Avant Quattro,diving,BCD,M,Mares,Avant Quattro,,,BCD-M-001,excellent,New BCD`

### **Regulator:**
- **Sizes:** Standard
- **Thickness:** Leave empty
- **Style:** Leave empty
- **Hood:** Leave empty
- **Example:** `Regulator Aqualung Calypso,diving,Regulator,Standard,Aqualung,Calypso,,,REG-001,excellent,New regulator`

### **Mask:**
- **Sizes:** Standard
- **Thickness:** Leave empty
- **Style:** Leave empty
- **Hood:** Leave empty
- **Example:** `Mask Cressi Big Eyes Evolution,diving,Mask,Standard,Cressi,Big Eyes Evolution,,,MASK-001,excellent,New mask`

### **Fins:**
- **Sizes:** XS, S, M, L, XL, XXL
- **Thickness:** Leave empty
- **Style:** Leave empty
- **Hood:** Leave empty
- **Example:** `Fins Cressi Pro Light,diving,Fins,M,Cressi,Pro Light,,,FINS-M-001,excellent,New fins`

### **Wetsuit:**
- **Sizes:** XS, S, M, L, XL, XXL
- **Thickness:** 3mm, 5mm, 7mm
- **Style:** Shorty, Full
- **Hood:** Yes, No
- **Example:** `Wetsuit Full 5mm Cressi,diving,Wetsuit,M,Cressi,Full 5mm,5mm,Full,No,WS-FULL-5MM-M-001,excellent,New wetsuit`

### **Semi-Dry Suit:**
- **Sizes:** M, L, XL, XXL
- **Thickness:** 7mm
- **Style:** Semi-Dry
- **Hood:** Yes
- **Example:** `Semi-Dry Suit 7mm Cressi,diving,Semi-Dry,M,Cressi,Semi-Dry 7mm,7mm,Semi-Dry,Yes,SDS-7MM-M-001,excellent,New semi-dry suit`

---

## 📝 **Step-by-Step Instructions**

### **1. Prepare Your Data:**
1. **Download** the template file: `equipment-bulk-import-template.csv`
2. **Open** in Excel, Google Sheets, or any CSV editor
3. **Review** the example data to understand the format
4. **Clear** the example data (keep the header row)
5. **Add** your equipment data following the guidelines

### **2. Fill in Equipment Data:**
1. **Name:** Descriptive equipment name
2. **Category:** Usually "diving" for diving equipment
3. **Type:** Choose from: BCD, Regulator, Mask, Fins, Wetsuit, Semi-Dry
4. **Size:** Use standard sizes (XS, S, M, L, XL, XXL, Standard)
5. **Brand:** Manufacturer name (optional)
6. **Model:** Equipment model (optional)
7. **Thickness:** For wetsuits only (3mm, 5mm, 7mm)
8. **Style:** For wetsuits only (Shorty, Full, Semi-Dry)
9. **Hood:** For wetsuits only (Yes, No)
10. **Serial Number:** Unique identifier for each piece
11. **Condition:** excellent, good, fair, poor
12. **Notes:** Any additional information

### **3. Save and Import:**
1. **Save** the file as CSV format
2. **Go to** Equipment Management in DCMS
3. **Click** "Bulk Import" button
4. **Select** your CSV file
5. **Review** the preview of data to be imported
6. **Confirm** the import

---

## ⚠️ **Important Rules**

### **Required Fields:**
- ✅ **name** - Must not be empty
- ✅ **category** - Must not be empty
- ✅ **type** - Must not be empty
- ✅ **size** - Must not be empty
- ✅ **serialNumber** - Must be unique
- ✅ **condition** - Must be one of: excellent, good, fair, poor

### **Size Guidelines:**
- **BCD, Fins, Wetsuits:** XS, S, M, L, XL, XXL
- **Regulators, Masks:** Standard
- **Tanks:** 10L, 12L, 15L, 18L
- **Computers:** Standard

### **Serial Number Rules:**
- **Must be unique** across all equipment
- **Use consistent format:** BCD-XS-001, REG-001, MASK-001
- **Include equipment type** in serial number for easy identification

### **Condition Values:**
- **excellent** - New or like-new condition
- **good** - Minor wear, fully functional
- **fair** - Some wear, needs minor maintenance
- **poor** - Significant wear, needs major repair

---

## 📋 **Example Data Entries**

### **BCD Example:**
```csv
BCD Mares Avant Quattro,diving,BCD,M,Mares,Avant Quattro,,,BCD-M-001,excellent,New BCD excellent condition
```

### **Wetsuit Example:**
```csv
Wetsuit Full 5mm with Hood Cressi,diving,Wetsuit,L,Cressi,Full 5mm with Hood,5mm,Full,Yes,WS-FULL-5MM-HOOD-L-001,excellent,New wetsuit with hood
```

### **Regulator Example:**
```csv
Regulator Aqualung Calypso,diving,Regulator,Standard,Aqualung,Calypso,,,REG-001,excellent,New regulator recently serviced
```

### **Fins Example:**
```csv
Fins Cressi Pro Light,diving,Fins,XL,Cressi,Pro Light,,,FINS-XL-001,excellent,New fins excellent condition
```

---

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **"Serial number already exists"**
   - **Solution:** Use unique serial numbers for each piece
   - **Check:** Existing equipment for duplicate serial numbers

2. **"Invalid size"**
   - **Solution:** Use only: XS, S, M, L, XL, XXL, Standard
   - **Check:** Size spelling and capitalization

3. **"Invalid condition"**
   - **Solution:** Use only: excellent, good, fair, poor
   - **Check:** Condition spelling and capitalization

4. **"Missing required field"**
   - **Solution:** Fill in all required fields (name, category, type, size, serialNumber, condition)
   - **Check:** No empty cells in required columns

### **File Format Issues:**

1. **"File format not supported"**
   - **Solution:** Save as CSV format (.csv extension)
   - **Check:** File is not Excel format (.xlsx)

2. **"Invalid CSV format"**
   - **Solution:** Ensure proper comma separation
   - **Check:** No commas in text fields (use quotes if needed)

---

## 📊 **Best Practices**

### **Data Quality:**
- **Use consistent naming** for similar equipment
- **Include brand and model** for better tracking
- **Use descriptive notes** for maintenance tracking
- **Keep serial numbers organized** by equipment type

### **Efficiency Tips:**
- **Prepare data in Excel** first, then save as CSV
- **Use copy/paste** for similar equipment entries
- **Review data** before importing
- **Test with small batch** first

### **Maintenance Tracking:**
- **Include condition notes** for future reference
- **Use consistent condition ratings**
- **Add maintenance notes** in the notes field
- **Update condition** after maintenance

---

## 🎯 **Quick Reference**

### **Equipment Types Available:**
- BCD, Regulator, Mask, Fins, Wetsuit, Semi-Dry, Dry Suit, Tank, Computer, Torch, Accessory

### **Standard Sizes:**
- XS, S, M, L, XL, XXL, Standard

### **Wetsuit Thickness:**
- 3mm, 5mm, 7mm

### **Wetsuit Styles:**
- Shorty, Full, Semi-Dry

### **Conditions:**
- excellent, good, fair, poor

### **Hood Options:**
- Yes, No

---

**Need Help?** Contact the system administrator for assistance with bulk import issues.
