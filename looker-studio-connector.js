// Base API endpoint for fetching university data
const BASE_URL = "http://universities.hipolabs.com/search";

// Initialize the Community Connector using the DataStudioApp service
const communityConnector = DataStudioApp.createCommunityConnector();

const schema = [
  {
    name: "id",
    label: "ID",
    dataType: "string",
    semantics: { conceptType: "DIMENSION" },
  },
];

// Return the defined schema to Data Studio
const getSchema = (request) => {
  return { schema: schema };
};

// Define the configuration settings for the connector, including user input fields
const getConfig = (request) => {
  let config = communityConnector.getConfig();

  config
    .newInfo()
    .setId("instructions")
    .setText("Enter your API credentials and select the fields you want to display.");

  // Basic authentication
  createInput(config, "Company ID", "Enter your Company ID", false);
  createInput(config, "Username", "Enter your API username", false);
  createInput(config, "Password", "Enter your API password", false);

  createInput(
    config,
    "API URL",
    "Enter the API URL for fetching siag data. Default is /pesv/vehiculo"
  );

  return config.build();
};

const getData = (request) => {
  // Get the fields requested by Looker Studio
  let dataSchema = request.fields.map((field) => ({
    name: idlize(field.name),
    label: field.name,
    dataType: "STRING",
    semantics: { conceptType: "DIMENSION" },
  }));

  // Construct the API URL based on user input
  let url = `${BASE_URL}${request.configParams.apiUrl}`;

  // Fetch and parse the API response
  const response = UrlFetchApp.fetch(url);
  const parsedResponse = JSON.parse(response);

  // Map the API response to the schema for Data Studio
  const rows = parsedResponse.map((university) => ({
    values: request.fields.map((field) => university[field.name]),
  }));

  return {
    schema: dataSchema,
    rows: rows,
  };
};

// Specify the authentication type for the connector
const getAuthType = () =>
  communityConnector
    .newAuthTypeResponse()
    .setAuthType(communityConnector.AuthType.USER_PASS)
    .setHelpUrl(`${BASE_URL}/seguridad/login`)
    .build();

const isAuthValid = () => true;

// Check if the current user has administrative privileges
const isAdminUser = () => {
  // For this example, all users are treated as admin users
  return true;
};

// User-defined functions

const idlize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "_");

const createInput = (config, name, helpText, override = true) =>
  config
    .newTextInput()
    .setId(idlize(name))
    .setName(name)
    .setHelpText(helpText)
    .setAllowOverride(override);
