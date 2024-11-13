// Base API endpoint for fetching university data
const BASE_URL = "https://sgsst.co/api";

// Initialize the Community Connector using the DataStudioApp service
const communityConnector = DataStudioApp.createCommunityConnector();

const schema = [
  {
    name: "alpha_two_code",
    label: "Alpha Two Code",
    dataType: "STRING",
    semantics: { conceptType: "DIMENSION" },
  },
  {
    name: "country",
    label: "Country",
    dataType: "STRING",
    semantics: { conceptType: "DIMENSION" },
  },
  {
    name: "name",
    label: "Name",
    dataType: "STRING",
    semantics: { conceptType: "DIMENSION" },
  },
];

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
      required: true,
    }
  );

  return config.build();
};

// Return the defined schema to Data Studio
const getSchema = (request) => {
  const requiredError = { errorCode: "Please enter all required fields" };
  if (!request.configParams) {
    return requiredError;
  }

  const { endpoint, company_id, user_name, password } = request.configParams;

  if (!endpoint || !company_id || !user_name || !password) {
    return requiredError;
  }

  const token = login(company_id, user_name, password);

  if (!token) {
    return { errorCode: "INVALID_CREDENTIALS" };
  }

  return { schema: schema };
};

const getData = (request) => {
  // Get the fields requested by Looker Studio
  const dataSchema = request.fields.map((field) => ({
    name: idlize(field.name),
    label: field.name,
    dataType: "STRING",
    semantics: { conceptType: "DIMENSION" },
  }));

  // Fetch and parse the API response
  const response = UrlFetchApp.fetch(
    `${BASE_URL}${request.configParams.apiUrl}`
  );
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

// User-defined functions

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

const idlize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "_");

const createInput = (config, name, helpText, args = {}) =>
  config
    .newTextInput()
    .setId(idlize(name))
    .setName(`${name} ${args.required ? "*" : ""}`)
    .setHelpText(helpText)
    .setAllowOverride(args.override || true);
