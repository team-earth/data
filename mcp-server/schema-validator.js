import Ajv from 'ajv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize AJV with schemas
const ajv = new Ajv({
    allErrors: true,
    strict: false,
    allowUnionTypes: true
});

// Load schemas
const SCHEMAS = {};

async function loadSchemas() {
    try {
        const schemaFiles = {
            Resource: 'resource.schema.json',
            Contact: 'contact.schema.json',
            Metadata: 'metadata.schema.json',
            Dataset: 'dataset.schema.json'
        };

        for (const [name, filename] of Object.entries(schemaFiles)) {
            const schemaPath = path.join(__dirname, '..', 'schemas', filename);
            const schemaContent = await fs.readFile(schemaPath, 'utf-8');
            const schema = JSON.parse(schemaContent);

            SCHEMAS[name] = ajv.compile(schema);
            console.log(`✅ Loaded ${name} schema`);
        }

        console.log('🎉 All Pydantic schemas loaded successfully');
    } catch (error) {
        console.error('❌ Error loading schemas:', error.message);
        throw error;
    }
}

/**
 * Validate data against a Pydantic schema
 */
export function validateResource(data) {
    if (!SCHEMAS.Resource) {
        throw new Error('Resource schema not loaded. Call loadSchemas() first.');
    }

    const valid = SCHEMAS.Resource(data);
    return {
        valid,
        data: valid ? data : null,
        errors: valid ? [] : SCHEMAS.Resource.errors?.map(err =>
            `${err.instancePath || 'root'}: ${err.message}`
        ) || []
    };
}

/**
 * Validate an array of resources
 */
export function validateResources(resources) {
    if (!Array.isArray(resources)) {
        return {
            valid: false,
            data: null,
            errors: ['Expected an array of resources']
        };
    }

    const results = resources.map((resource, index) => {
        const result = validateResource(resource);
        if (!result.valid) {
            result.errors = result.errors.map(err => `Resource[${index}] ${err}`);
        }
        return result;
    });

    const valid = results.every(r => r.valid);
    return {
        valid,
        data: valid ? resources : null,
        errors: results.flatMap(r => r.errors)
    };
}

/**
 * Validate contact information
 */
export function validateContact(contact) {
    if (!SCHEMAS.Contact) {
        throw new Error('Contact schema not loaded. Call loadSchemas() first.');
    }

    const valid = SCHEMAS.Contact(contact);
    return {
        valid,
        data: valid ? contact : null,
        errors: valid ? [] : SCHEMAS.Contact.errors?.map(err =>
            `${err.instancePath || 'root'}: ${err.message}`
        ) || []
    };
}

/**
 * Get schema information
 */
export function getSchemaInfo() {
    return {
        loaded: Object.keys(SCHEMAS),
        resourceSchema: SCHEMAS.Resource?.schema || null,
        version: '1.0.0'
    };
}

/**
 * Initialize schema validation
 */
export async function initializeSchemaValidation() {
    await loadSchemas();
    return {
        validateResource,
        validateResources,
        validateContact,
        getSchemaInfo
    };
}

// Export individual validators
export { loadSchemas };
