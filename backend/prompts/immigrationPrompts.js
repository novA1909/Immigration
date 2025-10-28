/**
 * Immigration Document Prompts
 * Contains prompt templates for Claude AI to analyze immigration documents
 * Each function returns a carefully crafted prompt for specific tasks
 */

/**
 * Document Classification Prompt
 * Identifies the type of immigration document from OCR text
 * Returns structured JSON with document type and confidence
 *
 * @param {string} ocrText - Text extracted from document via OCR
 * @returns {string} - Formatted prompt for Claude
 */
const classifyDocPrompt = (ocrText) => {
  // Build the classification prompt
  // This prompt asks Claude to identify what type of document it is
  return `You are an expert immigration document classifier. Analyze the following text extracted from a document via OCR and determine what type of immigration document it is.

OCR TEXT:
${ocrText}

---

AVAILABLE DOCUMENT TYPES:
- passport: Official passport with photo, passport number, and personal details
- birth-certificate: Birth certificate with name, date of birth, and parents' names
- marriage-certificate: Marriage certificate with spouse names and marriage date
- educational-certificate: Diploma, degree, or academic certificate
- employment-letter: Letter from employer confirming employment
- bank-statement: Bank account statement showing transactions
- police-clearance: Criminal record check or police clearance certificate
- medical-certificate: Medical examination results or health certificate
- photos: Passport-style photos or identification photos
- visa-application: Visa application form
- sponsor-letter: Letter of sponsorship from a sponsor
- other: Any other type of document

INSTRUCTIONS:
1. Analyze the OCR text carefully
2. Look for key identifiers (passport number, certificate type, letterhead, etc.)
3. Determine which document type best matches
4. Provide confidence score (0-100) based on clarity of indicators

RESPONSE FORMAT (JSON only):
{
  "documentType": "passport",
  "confidence": 95,
  "reasoning": "Document contains passport number format, issue/expiry dates, and nationality field typical of passports"
}

Return ONLY valid JSON, no additional text.`;
};

/**
 * Document Summarization Prompt
 * Creates a concise 2-3 sentence summary of the document
 * Focuses on key information relevant to immigration
 *
 * @param {string} ocrText - Text extracted from document via OCR
 * @param {string} docType - Type of document (passport, certificate, etc.)
 * @returns {string} - Formatted prompt for Claude
 */
const summarizeDocPrompt = (ocrText, docType) => {
  // Build the summarization prompt
  // This prompt asks Claude to create a brief, informative summary
  return `You are an expert immigration document analyst. Read the following ${docType} document text and create a clear, concise summary.

DOCUMENT TYPE: ${docType}

OCR TEXT:
${ocrText}

---

INSTRUCTIONS:
1. Create a 2-3 sentence summary of the document
2. Focus on key information relevant to immigration (names, dates, IDs, validity)
3. Highlight any important details or anomalies
4. Use clear, professional language
5. If the OCR text is unclear or incomplete, note this in the summary

EXAMPLES:

For a passport:
"This is a United States passport issued to John Michael Doe (passport number AB1234567) on January 15, 2020, with an expiry date of January 15, 2030. The passport holder is a U.S. citizen born on March 22, 1990. The document appears valid and current."

For a birth certificate:
"This birth certificate confirms the birth of Jane Mary Smith on June 10, 1995, in Los Angeles, California. Parents listed are Robert Smith (father) and Maria Smith (mother). Registration number BC-12345678."

For an employment letter:
"This employment verification letter from Tech Corp Inc. confirms that John Doe has been employed as a Software Engineer since September 1, 2022, with an annual salary of $85,000. The letter is dated March 15, 2024, and signed by the HR Director."

RESPONSE FORMAT (JSON only):
{
  "summary": "Your 2-3 sentence summary here"
}

Return ONLY valid JSON, no additional text.`;
};

/**
 * Field Extraction Prompt
 * Extracts specific data fields from the document
 * Returns structured JSON with key-value pairs
 *
 * @param {string} ocrText - Text extracted from document via OCR
 * @param {string} docType - Type of document (determines which fields to extract)
 * @returns {string} - Formatted prompt for Claude
 */
const extractFieldsPrompt = (ocrText, docType) => {
  // Define which fields to extract based on document type
  // Each document type has specific fields that are important for immigration
  let fieldsToExtract = '';

  // Determine fields based on document type
  switch (docType) {
    case 'passport':
      fieldsToExtract = `
FIELDS TO EXTRACT:
- fullName: Full name as it appears on passport
- passportNumber: Passport number (format varies by country)
- dateOfBirth: Date of birth (format: YYYY-MM-DD)
- placeOfBirth: Place of birth (city, country)
- nationality: Nationality/citizenship
- gender: Gender
- issueDate: Date of issue (format: YYYY-MM-DD)
- expiryDate: Date of expiry (format: YYYY-MM-DD)
- issuingAuthority: Issuing country/authority`;
      break;

    case 'birth-certificate':
      fieldsToExtract = `
FIELDS TO EXTRACT:
- fullName: Full name of the person
- dateOfBirth: Date of birth (format: YYYY-MM-DD)
- placeOfBirth: Place of birth (city, state/province, country)
- gender: Gender
- fatherName: Father's full name
- motherName: Mother's full name
- registrationNumber: Certificate or registration number
- registrationDate: Date of registration (format: YYYY-MM-DD)
- issuingAuthority: Issuing authority or registrar`;
      break;

    case 'marriage-certificate':
      fieldsToExtract = `
FIELDS TO EXTRACT:
- spouse1Name: First spouse's full name
- spouse2Name: Second spouse's full name
- marriageDate: Date of marriage (format: YYYY-MM-DD)
- marriagePlace: Place of marriage (city, state/province, country)
- registrationNumber: Certificate or registration number
- registrationDate: Date of registration (format: YYYY-MM-DD)
- issuingAuthority: Issuing authority or registrar`;
      break;

    case 'educational-certificate':
      fieldsToExtract = `
FIELDS TO EXTRACT:
- fullName: Student's full name
- degree: Degree or qualification obtained (e.g., Bachelor of Science)
- major: Field of study or major
- institution: Name of institution/university
- completionDate: Date of completion/graduation (format: YYYY-MM-DD)
- grade: Final grade or GPA
- certificateNumber: Certificate or registration number`;
      break;

    case 'employment-letter':
      fieldsToExtract = `
FIELDS TO EXTRACT:
- fullName: Employee's full name
- position: Job title or position
- companyName: Company or employer name
- startDate: Employment start date (format: YYYY-MM-DD)
- endDate: Employment end date (format: YYYY-MM-DD) or "current" if still employed
- salary: Annual salary or wage (include currency)
- letterDate: Date the letter was issued (format: YYYY-MM-DD)
- signatoryName: Name of person who signed the letter
- signatoryTitle: Title of signatory (e.g., HR Manager)`;
      break;

    case 'bank-statement':
      fieldsToExtract = `
FIELDS TO EXTRACT:
- accountHolderName: Name of account holder
- accountNumber: Account number (mask all but last 4 digits for security)
- bankName: Name of bank or financial institution
- statementPeriod: Statement period (e.g., "January 2024" or "2024-01-01 to 2024-01-31")
- openingBalance: Opening balance with currency
- closingBalance: Closing balance with currency
- currency: Currency code (USD, EUR, GBP, etc.)`;
      break;

    case 'police-clearance':
      fieldsToExtract = `
FIELDS TO EXTRACT:
- fullName: Full name of person
- dateOfBirth: Date of birth (format: YYYY-MM-DD)
- certificateNumber: Certificate or reference number
- issueDate: Date of issue (format: YYYY-MM-DD)
- expiryDate: Date of expiry (format: YYYY-MM-DD)
- issuingAuthority: Police department or issuing authority
- clearanceStatus: Status (e.g., "No criminal record", "Clear", etc.)
- jurisdiction: Jurisdiction or region covered`;
      break;

    case 'medical-certificate':
      fieldsToExtract = `
FIELDS TO EXTRACT:
- fullName: Patient's full name
- dateOfBirth: Date of birth (format: YYYY-MM-DD)
- examinationDate: Date of medical examination (format: YYYY-MM-DD)
- certificateNumber: Certificate or reference number
- doctorName: Examining physician's name
- doctorLicense: Doctor's license number (if available)
- facilityName: Medical facility or clinic name
- medicalStatus: Overall medical status or fitness declaration`;
      break;

    default:
      // Generic fields for other document types
      fieldsToExtract = `
FIELDS TO EXTRACT:
- Extract any relevant information such as:
  - Names (full names of people mentioned)
  - Dates (any important dates in format YYYY-MM-DD)
  - Numbers (ID numbers, reference numbers, etc.)
  - Organizations (company names, institutions, authorities)
  - Addresses (locations, addresses)
  - Amounts (monetary amounts with currency)`;
  }

  // Build the extraction prompt
  return `You are an expert at extracting structured data from immigration documents. Analyze the following ${docType} document and extract specific fields.

DOCUMENT TYPE: ${docType}

OCR TEXT:
${ocrText}

---

${fieldsToExtract}

INSTRUCTIONS:
1. Extract ONLY the fields listed above
2. Use exact format specified for dates (YYYY-MM-DD)
3. If a field is not found or unclear, omit it (don't include null or "not found")
4. Be precise - extract exactly what is written, don't infer or guess
5. For names, use full name as it appears
6. For dates, standardize to YYYY-MM-DD format
7. If OCR text is poor quality, extract what you can confidently read

RESPONSE FORMAT (JSON only):
{
  "field1": "value1",
  "field2": "value2"
}

Example for passport:
{
  "fullName": "John Michael Doe",
  "passportNumber": "AB1234567",
  "dateOfBirth": "1990-03-22",
  "nationality": "United States",
  "issueDate": "2020-01-15",
  "expiryDate": "2030-01-15"
}

Return ONLY valid JSON with extracted fields, no additional text.`;
};

/**
 * Missing Documents Suggestion Prompt
 * Analyzes user's uploaded documents and suggests what's still needed
 * Based on immigration requirements for the destination country
 *
 * @param {Array} uploadedDocs - Array of document types already uploaded
 * @param {Array} requiredDocs - Array of required document types for country
 * @param {string} countryName - Name of destination country
 * @param {number} userProgress - Current progress percentage
 * @returns {string} - Formatted prompt for Claude
 */
const missingDocsPrompt = (uploadedDocs, requiredDocs, countryName, userProgress) => {
  // Convert arrays to formatted strings for better readability
  const uploadedList = uploadedDocs.length > 0
    ? uploadedDocs.map((doc) => `- ${doc}`).join('\n')
    : 'None uploaded yet';

  const requiredList = requiredDocs.map((doc) => `- ${doc}`).join('\n');

  // Build the missing documents prompt
  return `You are an immigration advisor helping a client prepare documents for immigration to ${countryName}. Analyze their progress and provide guidance on missing documents.

DESTINATION COUNTRY: ${countryName}

CURRENT PROGRESS: ${userProgress}%

REQUIRED DOCUMENTS:
${requiredList}

DOCUMENTS ALREADY UPLOADED:
${uploadedList}

---

INSTRUCTIONS:
1. Identify which required documents are still missing
2. Prioritize documents by importance (critical first, then supporting)
3. Provide brief, actionable guidance for each missing document
4. If all documents are uploaded, congratulate and suggest next steps
5. Be encouraging and supportive in tone

RESPONSE FORMAT (JSON only):
{
  "missingDocuments": [
    {
      "documentType": "passport",
      "priority": "critical",
      "guidance": "Upload a clear scan of your passport showing the photo page and signature. Ensure it's valid for at least 6 months beyond your intended stay."
    },
    {
      "documentType": "birth-certificate",
      "priority": "high",
      "guidance": "Provide an official birth certificate or certified copy. It should be in English or accompanied by a certified translation."
    }
  ],
  "completionMessage": "You're making great progress! Once you upload these 2 remaining documents, your application will be complete.",
  "nextSteps": "After uploading all documents, they will be reviewed by an immigration specialist. You'll receive email updates on the status."
}

Priority levels: "critical", "high", "medium", "low"

Return ONLY valid JSON, no additional text.`;
};

/**
 * General Immigration Question Prompt
 * Answers general questions about immigration process, requirements, or procedures
 * NOT for analyzing specific documents
 *
 * @param {string} question - User's immigration-related question
 * @param {string} context - Additional context (country, document type, etc.)
 * @returns {string} - Formatted prompt for Claude
 */
const generalQuestionPrompt = (question, context = '') => {
  // Build general Q&A prompt
  return `You are a knowledgeable immigration advisor. Answer the following question clearly and accurately.

QUESTION:
${question}

${context ? `CONTEXT:\n${context}\n` : ''}

---

INSTRUCTIONS:
1. Provide a clear, accurate answer
2. Be specific and practical
3. If you're uncertain, say so and suggest consulting official sources
4. Keep response concise but informative (2-4 sentences)
5. Use professional but friendly tone

RESPONSE FORMAT (JSON only):
{
  "answer": "Your clear and concise answer here",
  "disclaimer": "This is general information. For specific advice, consult an immigration attorney or official government resources."
}

Return ONLY valid JSON, no additional text.`;
};

// Export all prompt functions
module.exports = {
  classifyDocPrompt,
  summarizeDocPrompt,
  extractFieldsPrompt,
  missingDocsPrompt,
  generalQuestionPrompt,
};
