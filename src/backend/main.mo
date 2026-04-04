import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User data storage
  let userData = Map.empty<Principal, (Text, Time.Time)>();

  // User profiles storage
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public type UserDataEntry = {
    data : Text;
    lastUpdated : Time.Time;
  };

  // Public query - no auth required
  public query ({ caller }) func getAppName() : async Text {
    "Naksha (v1.0.0)";
  };

  // User profile management functions (required by frontend)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user: Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // App data management functions
  public query ({ caller }) func getUserData() : async ?UserDataEntry {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can retrieve data");
    };
    switch (userData.get(caller)) {
      case (null) { null };
      case (?entry) {
        ?{
          data = entry.0;
          lastUpdated = entry.1;
        };
      };
    };
  };

  public shared ({ caller }) func saveUserData(data : Text) : async Time.Time {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save data");
    };
    let now = Time.now();
    userData.add(caller, (data, now));
    now;
  };

  public query ({ caller }) func getLastUpdated() : async ?Time.Time {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check timestamps");
    };
    switch (userData.get(caller)) {
      case (null) { null };
      case (?entry) { ?entry.1 };
    };
  };

  public shared ({ caller }) func deleteData() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete data");
    };
    if (userData.containsKey(caller)) {
      userData.remove(caller);
    } else {
      Runtime.trap("No data found for user");
    };
  };
};
