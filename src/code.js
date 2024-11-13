const BASE_URL = "https://sgsst.co/api";
const communityConnector = DataStudioApp.createCommunityConnector();

// Define the configuration settings for the connector, including user input fields
const getConfig = (request) => {
  const config = communityConnector.getConfig();

  config
    .newInfo()
    .setId("instructions")
    .setText(
      "Enter your API credentials and select the fields you want to display."
    );

  // Basic authentication
  createInput(config, "Company ID", "Enter your Company ID", {
    override: false,
    required: true,
  });
  createInput(config, "Username", "Enter your API username", {
    override: false,
    required: true,
  });
  createInput(config, "Password", "Enter your API password", {
    override: false,
    required: true,
  });

  // Parameters
  createInput(
    config,
    "Endpoint",
    "Enter the endpoint for fetching siag data. Default is /pesv/vehiculo",
    {
      override: false,
      required: true,
    }
  );

  return config.build();
};

const getSchema = (request) => {
  const params = request.configParams;

  if (!params) {
    return sendError("Please enter all required fields");
  }

  const requiredParams = ["company_id", "username", "password", "endpoint"];

  requiredParams.forEach((param) => {
    if (!params[param]) {
      return sendError(`Missing required parameter: ${param}`);
    }
  });

  const { endpoint, company_id, username, password } = params;

  // Login
  const token = login(company_id, username, password);

  if (!token) {
    return sendError("invalid credentials");
  }

  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty("token", token);

  // Creating schema
  try {
    const response = UrlFetchApp.fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const { data: dataList } = JSON.parse(response);
    const data = dataList.shift();

    const validTypes = ["STRING", "NUMBER", "BOOLEAN"];
    const schema = Object.keys(data)
      .map((key) => {
        const dataType = (typeof data[key]).toUpperCase();

        if (!validTypes.includes(dataType)) {
          return {};
        }

        return {
          name: idlize(key),
          label: key,
          dataType,
          semantics: { conceptType: "DIMENSION" },
        };
      })
      .filter((schema) => schema.name && schema.label && schema.dataType);

    userProperties.setProperty("schema", JSON.stringify(schema));
    return { schema };
  } catch (error) {
    sendError(`Error creating schema: ${error.message}`);
  }
};

const getData = (request) => {
  const userProperties = PropertiesService.getUserProperties();
  const schema = JSON.parse(userProperties.getProperty("schema"));
  const token = userProperties.getProperty("token");

  // Get the fields requested by Looker Studio
  const dataSchema = request.fields.map((field) =>
    findField(schema, field.name)
  );

  // Fetch and parse the API response
  const response = UrlFetchApp.fetch(
    `${BASE_URL}${request.configParams.endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const { data: dataList } = JSON.parse(response);

  // Map the API response to the schema for Data Studio
  const rows = dataList.map((data) => ({
    values: request.fields.map((field) => data[field.name]),
  }));

  return {
    schema: dataSchema,
    rows: rows,
  };
};

// User-defined functions

/**
 * Authenticates a user by sending login credentials to the server.
 *
 * This function constructs a login request using the provided company ID, username, and password.
 * It sends a POST request to the login endpoint and returns the user data if the authentication is successful.
 * If any of the required parameters are missing or if an error occurs during the request, it returns null.
 *
 * @function login
 * @param {string} companyId - The ID of the company the user is associated with.
 * @param {string} userName - The username of the user attempting to log in.
 * @param {string} password - The password of the user attempting to log in.
 * @returns {Object|null} The user data returned from the server if authentication is successful, or null if unsuccessful.
 */
const login = (companyId, userName, password) => {
  const url = `${BASE_URL}/seguridad/login`;

  if (!companyId || !userName || !password) {
    return null;
  }

  const payload = {
    id_empresa: companyId,
    usuario: userName,
    clave: password,
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: "POST",
      payload: JSON.stringify(payload),
      contentType: "application/json",
    });

    const { data } = JSON.parse(response);

    return data;
  } catch (error) {
    return null;
  }
};

/**
 * Converts a string into a lowercase, underscore-separated identifier.
 *
 * This function transforms the input string by converting all characters to lowercase and replacing
 * any non-alphanumeric characters with underscores. This is useful for creating standardized identifiers
 * that can be safely used in various contexts, such as variable names or database keys.
 *
 * @function idlize
 * @param {string} str - The input string to be transformed.
 * @returns {string} The transformed string, formatted as a lowercase identifier with underscores.
 */
const idlize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "_");

const createInput = (
  config,
  name,
  helpText,
  { required = false, override = true } = {}
) =>
  config
    .newTextInput()
    .setId(idlize(name))
    .setName(`${name} ${required ? "*" : ""}`)
    .setHelpText(helpText)
    .setAllowOverride(override);

/**
 * Sends an error message to the community connector.
 *
 * This function creates a new user error with the specified error message and optional debug information.
 * It then throws the exception to notify the user of the error encountered during execution.
 *
 * @function sendError
 * @param {string} error - The error message to be displayed to the user.
 * @param {string|null} [debugError=null] - Optional debug information to be logged; if not provided, the main error message is used.
 * @throws {Error} Throws an exception with the user error message.
 */
const sendError = (error, debugError = null) =>
  communityConnector
    .newUserError()
    .setDebugText(debugError || error)
    .setText(error)
    .throwException();

/**
 * Retrieves a field from the schema by its name.
 *
 * This function searches the provided schema for a field that matches the specified name.
 * If the field is found, it returns the field object; otherwise, it sends an error message and returns null.
 *
 * @function findField
 * @param {Array<Object>} schema - An array of field objects representing the schema.
 * @param {string} name - The name of the field to search for in the schema.
 * @returns {Object|null} The field object if found, or null if not found.
 */
const findField = (schema, name) => {
  const field = schema.find((field) => field.name === name);

  if (!field) {
    sendError(`Field ${name} not found in schema`);
    return null;
  }

  return field;
};
