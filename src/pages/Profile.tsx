import { useState } from "react";
import {
  User,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Heart,
  AlertTriangle,
  Target,
  Calendar,
  Weight,
  Activity,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserProfile {
  name: string;
  email: string;
  age: number;
  weight: number;
  height: number;
  activityLevel: string;
  dietaryPreferences: string[];
  allergies: string[];
  healthConditions: string[];
  nutritionGoals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
  };
  notifications: {
    emailAlerts: boolean;
    pushNotifications: boolean;
    weeklyReports: boolean;
    expirationReminders: boolean;
  };
}

const initialProfile: UserProfile = {
  name: "Sarah Johnson",
  email: "akash@gmail.com",
  age: 32,
  weight: 65,
  height: 168,
  activityLevel: "moderate",
  dietaryPreferences: ["Vegetarian", "Low-Sodium"],
  allergies: ["Nuts", "Shellfish"],
  healthConditions: ["Pre-diabetes"],
  nutritionGoals: {
    calories: 1800,
    protein: 100,
    carbs: 225,
    fat: 60,
    fiber: 25,
    sodium: 2000,
  },
  notifications: {
    emailAlerts: true,
    pushNotifications: true,
    weeklyReports: true,
    expirationReminders: false,
  },
};

const dietaryOptions = [
  "Vegetarian",
  "Vegan",
  "Keto",
  "Paleo",
  "Mediterranean",
  "Low-Carb",
  "Low-Sodium",
  "Gluten-Free",
  "Dairy-Free",
];

const allergyOptions = [
  "Nuts",
  "Shellfish",
  "Dairy",
  "Eggs",
  "Soy",
  "Wheat",
  "Fish",
  "Sesame",
];

const healthConditionOptions = [
  "Diabetes",
  "Pre-diabetes",
  "High Blood Pressure",
  "High Cholesterol",
  "Heart Disease",
  "Kidney Disease",
  "Celiac Disease",
  "IBS",
];

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] =
    useState<UserProfile>(initialProfile);
  const [newDietaryPref, setNewDietaryPref] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [newHealthCondition, setNewHealthCondition] = useState("");

  const handleSave = () => {
    setProfile(editedProfile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const addDietaryPreference = () => {
    if (
      newDietaryPref &&
      !editedProfile.dietaryPreferences.includes(newDietaryPref)
    ) {
      setEditedProfile({
        ...editedProfile,
        dietaryPreferences: [
          ...editedProfile.dietaryPreferences,
          newDietaryPref,
        ],
      });
      setNewDietaryPref("");
    }
  };

  const addAllergy = () => {
    if (newAllergy && !editedProfile.allergies.includes(newAllergy)) {
      setEditedProfile({
        ...editedProfile,
        allergies: [...editedProfile.allergies, newAllergy],
      });
      setNewAllergy("");
    }
  };

  const addHealthCondition = () => {
    if (
      newHealthCondition &&
      !editedProfile.healthConditions.includes(newHealthCondition)
    ) {
      setEditedProfile({
        ...editedProfile,
        healthConditions: [
          ...editedProfile.healthConditions,
          newHealthCondition,
        ],
      });
      setNewHealthCondition("");
    }
  };

  const removeDietaryPreference = (pref: string) => {
    setEditedProfile({
      ...editedProfile,
      dietaryPreferences: editedProfile.dietaryPreferences.filter(
        (p) => p !== pref,
      ),
    });
  };

  const removeAllergy = (allergy: string) => {
    setEditedProfile({
      ...editedProfile,
      allergies: editedProfile.allergies.filter((a) => a !== allergy),
    });
  };

  const removeHealthCondition = (condition: string) => {
    setEditedProfile({
      ...editedProfile,
      healthConditions: editedProfile.healthConditions.filter(
        (c) => c !== condition,
      ),
    });
  };

  const calculateBMI = () => {
    const heightInM = profile.height / 100;
    return (profile.weight / (heightInM * heightInM)).toFixed(1);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: "Underweight", color: "blue" };
    if (bmi < 25) return { category: "Normal", color: "green" };
    if (bmi < 30) return { category: "Overweight", color: "amber" };
    return { category: "Obese", color: "red" };
  };

  const currentProfile = isEditing ? editedProfile : profile;
  const bmi = parseFloat(calculateBMI());
  const bmiInfo = getBMICategory(bmi);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-semibold">
              {profile.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">{profile.name}</h1>
            <p className="text-lg text-gray-600">{profile.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Personal Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2 text-emerald-600" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Basic information used for personalized recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={currentProfile.name}
                      onChange={(e) =>
                        setEditedProfile({
                          ...editedProfile,
                          name: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{currentProfile.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={currentProfile.email}
                      onChange={(e) =>
                        setEditedProfile({
                          ...editedProfile,
                          email: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{currentProfile.email}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="age">Age</Label>
                  {isEditing ? (
                    <Input
                      id="age"
                      type="number"
                      value={currentProfile.age}
                      onChange={(e) =>
                        setEditedProfile({
                          ...editedProfile,
                          age: parseInt(e.target.value),
                        })
                      }
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">
                      {currentProfile.age} years
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="activity">Activity Level</Label>
                  {isEditing ? (
                    <Select
                      value={currentProfile.activityLevel}
                      onValueChange={(value) =>
                        setEditedProfile({
                          ...editedProfile,
                          activityLevel: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary">Sedentary</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="very-active">Very Active</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 text-gray-900 capitalize">
                      {currentProfile.activityLevel}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  {isEditing ? (
                    <Input
                      id="weight"
                      type="number"
                      value={currentProfile.weight}
                      onChange={(e) =>
                        setEditedProfile({
                          ...editedProfile,
                          weight: parseFloat(e.target.value),
                        })
                      }
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">
                      {currentProfile.weight} kg
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  {isEditing ? (
                    <Input
                      id="height"
                      type="number"
                      value={currentProfile.height}
                      onChange={(e) =>
                        setEditedProfile({
                          ...editedProfile,
                          height: parseFloat(e.target.value),
                        })
                      }
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">
                      {currentProfile.height} cm
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dietary Preferences */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-5 w-5 mr-2 text-emerald-600" />
                Dietary Preferences
              </CardTitle>
              <CardDescription>
                Your dietary choices and restrictions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Preferences</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentProfile.dietaryPreferences.map((pref) => (
                    <Badge
                      key={pref}
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-700"
                    >
                      {pref}
                      {isEditing && (
                        <button
                          onClick={() => removeDietaryPreference(pref)}
                          className="ml-2 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
              {isEditing && (
                <div className="flex space-x-2">
                  <Select
                    value={newDietaryPref}
                    onValueChange={setNewDietaryPref}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add dietary preference" />
                    </SelectTrigger>
                    <SelectContent>
                      {dietaryOptions
                        .filter(
                          (option) =>
                            !currentProfile.dietaryPreferences.includes(option),
                        )
                        .map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addDietaryPreference} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health Information */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
                Health Information
              </CardTitle>
              <CardDescription>
                Allergies and health conditions for safety alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Allergies</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentProfile.allergies.map((allergy) => (
                    <Badge
                      key={allergy}
                      variant="secondary"
                      className="bg-red-100 text-red-700"
                    >
                      {allergy}
                      {isEditing && (
                        <button
                          onClick={() => removeAllergy(allergy)}
                          className="ml-2 hover:text-red-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {isEditing && (
                  <div className="flex space-x-2 mt-2">
                    <Select value={newAllergy} onValueChange={setNewAllergy}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Add allergy" />
                      </SelectTrigger>
                      <SelectContent>
                        {allergyOptions
                          .filter(
                            (option) =>
                              !currentProfile.allergies.includes(option),
                          )
                          .map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addAllergy} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <Label>Health Conditions</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentProfile.healthConditions.map((condition) => (
                    <Badge
                      key={condition}
                      variant="secondary"
                      className="bg-amber-100 text-amber-700"
                    >
                      {condition}
                      {isEditing && (
                        <button
                          onClick={() => removeHealthCondition(condition)}
                          className="ml-2 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {isEditing && (
                  <div className="flex space-x-2 mt-2">
                    <Select
                      value={newHealthCondition}
                      onValueChange={setNewHealthCondition}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Add health condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {healthConditionOptions
                          .filter(
                            (option) =>
                              !currentProfile.healthConditions.includes(option),
                          )
                          .map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addHealthCondition} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Health Stats */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-emerald-600" />
                Health Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{bmi}</div>
                <div className="text-sm text-gray-600">BMI</div>
                <Badge
                  className={`mt-2 bg-${bmiInfo.color}-100 text-${bmiInfo.color}-700`}
                  variant="secondary"
                >
                  {bmiInfo.category}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Weight Goal</span>
                  <span className="text-sm font-medium">Maintain</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Activity Level</span>
                  <span className="text-sm font-medium capitalize">
                    {profile.activityLevel}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nutrition Goals */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-emerald-600" />
                Daily Nutrition Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Calories</span>
                <span className="font-medium">
                  {currentProfile.nutritionGoals.calories}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Protein</span>
                <span className="font-medium">
                  {currentProfile.nutritionGoals.protein}g
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Carbs</span>
                <span className="font-medium">
                  {currentProfile.nutritionGoals.carbs}g
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Fat</span>
                <span className="font-medium">
                  {currentProfile.nutritionGoals.fat}g
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Fiber</span>
                <span className="font-medium">
                  {currentProfile.nutritionGoals.fiber}g
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Sodium</span>
                <span className="font-medium">
                  {currentProfile.nutritionGoals.sodium}mg
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-emerald-600" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-alerts" className="text-sm">
                  Email Alerts
                </Label>
                <Switch
                  id="email-alerts"
                  checked={currentProfile.notifications.emailAlerts}
                  onCheckedChange={(checked) =>
                    isEditing &&
                    setEditedProfile({
                      ...editedProfile,
                      notifications: {
                        ...editedProfile.notifications,
                        emailAlerts: checked,
                      },
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="push-notifications" className="text-sm">
                  Push Notifications
                </Label>
                <Switch
                  id="push-notifications"
                  checked={currentProfile.notifications.pushNotifications}
                  onCheckedChange={(checked) =>
                    isEditing &&
                    setEditedProfile({
                      ...editedProfile,
                      notifications: {
                        ...editedProfile.notifications,
                        pushNotifications: checked,
                      },
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="weekly-reports" className="text-sm">
                  Weekly Reports
                </Label>
                <Switch
                  id="weekly-reports"
                  checked={currentProfile.notifications.weeklyReports}
                  onCheckedChange={(checked) =>
                    isEditing &&
                    setEditedProfile({
                      ...editedProfile,
                      notifications: {
                        ...editedProfile.notifications,
                        weeklyReports: checked,
                      },
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="expiration-reminders" className="text-sm">
                  Expiration Reminders
                </Label>
                <Switch
                  id="expiration-reminders"
                  checked={currentProfile.notifications.expirationReminders}
                  onCheckedChange={(checked) =>
                    isEditing &&
                    setEditedProfile({
                      ...editedProfile,
                      notifications: {
                        ...editedProfile.notifications,
                        expirationReminders: checked,
                      },
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
