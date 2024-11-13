const getAuthType = () =>
  communityConnector
    .newAuthTypeResponse()
    .setAuthType(communityConnector.AuthType.NONE)
    .build();

const isAdminUser = () => true;
