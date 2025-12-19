# Spanish Diving Regulations - Data Requirements and Reporting

## Overview
This document summarizes the regulations for dive centers operating in Spain, particularly regarding data collection and reporting requirements for official documentation.

## Required Data for Divers

### 1. Personal Documentation
- **Full Name**
- **Date and Place of Birth**
- **Nationality**
- **Identification Document** (type and number)
- **Contact Information** (address, email, phone number)

### 2. Diving-Specific Documentation
- **Diving Certification** (level and issuing organization)
- **Medical Certificate/Questionnaire** (fitness for diving)
- **Diving Insurance** (proof of coverage for scuba diving accidents)

## Reporting Requirements

### Royal Decree 933/2021 (Tourist Data Collection)
**Status:** Enacted December 2, 2024

**Potential Applicability:** While primarily targeting accommodations and car rentals, this decree may also apply to dive centers as tourism service providers.

**Requirements if Applicable:**
- Collect comprehensive personal data from clients (40+ data points)
- **Transmit data to authorities within 24 hours** of collection
- **Retain data digitally for minimum 3 years**
- Notify authorities about activity details at least 10 days before commencing operations
- **Penalties:** €601 to €30,000 for non-compliance

**Data Recipient:** Ministry of the Interior (Ministerio del Interior)

### Marine Reserve Reporting (e.g., Cap de Creus Natural Park)
**For dive centers operating in marine reserves:**

**Monthly Activity Reports must include:**
- **Day and time** of each dive
- **Dive site location**
- **Number of clients/divers**
- **Number of guides/instructors**
- **Gender breakdown** (divers and guides)
- **Diving qualifications** of participants

**Additional Requirements:**
- Use of geolocation systems (e.g., Geoblue) for tracking diving activities
- Ecobriefing before each dive (park objectives, regulations, environmental guidelines)

**Data Recipients:**
- Marine Park Authorities
- General Directorate for Maritime Policy and Sustainable Fisheries (Dirección General de Política Marítima y Pesca Sostenible)

## Canary Islands Specific Considerations

While specific Canary Islands regulations were not explicitly detailed in the search results, dive centers should be aware that:

1. **Regional authorities** may have additional requirements
2. **Capitanía Marítima** (Maritime Captaincy) may require reporting of boat-based diving activities
3. **Environmental authorities** may require reporting for protected areas

## Recommended Data Fields for Post-Dive Reports

Based on the regulations, your post-dive report feature should capture:

### Essential Data:
- **Date and time** of dive
- **Actual dive site** (location/coordinates)
- **Boat name/identifier** (if applicable)
- **Number of divers** (with gender breakdown if required)
- **Number of guides/instructors** (with qualifications)
- **Diver certifications** (levels/qualifications)
- **Captain name**
- **Guide/instructor names**
- **Notes/observations** (conditions, incidents, environmental observations)

### Optional but Recommended:
- **Entry/exit times**
- **Maximum depth**
- **Dive duration**
- **Water conditions**
- **Visibility**
- **Temperature**
- **Weather conditions**
- **Incidents/accidents** (if any)

## Authorities That May Receive Reports

1. **Ministry of the Interior** (Ministerio del Interior)
   - For tourist data collection (RD 933/2021)

2. **Maritime Authorities** (Capitanía Marítima)
   - For boat-based diving activities
   - Safety and navigation compliance

3. **Marine Park Authorities**
   - For protected areas and marine reserves

4. **General Directorate for Maritime Policy and Sustainable Fisheries**
   - For environmental monitoring and conservation

5. **Regional Environmental Authorities**
   - For Canary Islands specific requirements

## Compliance Recommendations

1. **Consult Legal Expert:** Verify which regulations apply specifically to your dive center location (Canary Islands) and operations

2. **Documentation:** Maintain detailed records of all dives, including:
   - Date, time, location
   - Participant information
   - Staff assignments
   - Actual vs. planned dive sites
   - Any incidents or deviations

3. **Data Storage:** Ensure digital storage of records for minimum 3 years (as per RD 933/2021)

4. **Reporting Schedule:** Understand reporting frequency:
   - Real-time (within 24 hours) for tourist data (if applicable)
   - Monthly for marine reserve activities
   - Incident reporting (immediate for accidents)

5. **Data Privacy:** Ensure GDPR compliance for all personal data collected

## Sources and Further Research Needed

- Verify applicability of Royal Decree 933/2021 to dive centers
- Confirm Canary Islands specific requirements
- Check with local Capitanía Marítima for boat operation reporting
- Consult regional environmental authorities for protected area requirements
- Review any local municipal regulations

## Current System Implementation

Your current post-dive report system in `BoatPrep.jsx` captures:
- ✅ Date and session
- ✅ Boat information
- ✅ Dive site (planned and actual)
- ✅ Staff assignments (captain, guide, trainees)
- ✅ Number of divers
- ✅ Post-dive notes

**Recommended Enhancements:**
- Add diver certification levels
- Add gender breakdown (if required)
- Add specific time stamps (entry/exit)
- Add environmental data fields
- Add incident reporting capability
- Add export functionality for official reports

