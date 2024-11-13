const getAuthType = () =>
  communityConnector
    .newAuthTypeResponse()
    .setAuthType(communityConnector.AuthType.USER_PASS)
    .setHelpUrl(`${BASE_URL}/api-docs`)
    .build();

const isAuthValid = () => {
  const userProperties = PropertiesService.getUserProperties();
  const companyId = userProperties.getProperty("dscc.company_id");
  const userName = userProperties.getProperty("dscc.username");
  const password = userProperties.getProperty("dscc.password");

  return login(companyId, userName, password);
};

const setCredentials = (request) => {
  const { username, password } = request.userPass;

  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty("dscc.username", username);
  userProperties.setProperty("dscc.password", password);
  return { errorCode: "NONE" };
};

const resetAuth = () => {
  const userProperties = PropertiesService.getUserProperties();
  // userProperties.deleteProperty("dscc.company_id");
  userProperties.deleteProperty("dscc.username");
  userProperties.deleteProperty("dscc.password");
};

// Check if the current user has administrative privileges
const isAdminUser = () => {
  // For this example, all users are treated as admin users
  return true;
};

// User-defined functions

const login = (companyId, userName, password) => {
  const url = `${BASE_URL}/seguridad/login`;

  if (!companyId || userName || password) {
    return false;
  }

  const payload = {
    id_empresa: companyId,
    usuario: userName,
    clave: password,
  };

  console.log(payload);
  // Fetch and parse the API response
  const response = UrlFetchApp.fetch(url, {
    method: "POST",
    payload: JSON.stringify(payload),
    contentType: "application/json",
  });
  const parsedResponse = JSON.parse(response);

  return parsedResponse.success;
};
