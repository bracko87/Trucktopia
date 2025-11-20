/**
 * User Profile page with persistent form data
 * Saves changes to localStorage and maintains them until user modifies again
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';

interface ProfileData {
  firstName: string;
  lastName: string;
  birthday: string;
  country: string;
  city: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Profile: React.FC = () => {
  const { gameState } = useGame();
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    birthday: '',
    country: '',
    city: '',
    email: gameState.company?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isSaved, setIsSaved] = useState(false);

  // Get user-specific storage key
  const getStorageKey = () => {
    const userEmail = gameState.company?.email || 'anonymous';
    return `tm_user_profile_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  };

  // Load saved profile data from localStorage for current user only
  useEffect(() => {
    const savedProfile = localStorage.getItem(getStorageKey());
    if (savedProfile) {
      try {
        const parsedData = JSON.parse(savedProfile);
        setProfileData(prev => ({
          ...prev,
          ...parsedData,
          // Don't load passwords for security
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } catch (error) {
        console.log('No saved profile data found for current user');
      }
    }
  }, [gameState.company?.email]);

  // Save profile data to localStorage for current user only
  const saveProfileData = (data: ProfileData) => {
    // Don't save passwords for security
    const dataToSave = {
      firstName: data.firstName,
      lastName: data.lastName,
      birthday: data.birthday,
      country: data.country,
      city: data.city,
      email: data.email
    };
    
    localStorage.setItem(getStorageKey(), JSON.stringify(dataToSave));
    console.log('Profile data saved for user:', gameState.company?.email);
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsSaved(false);
  };

  const handleSaveChanges = () => {
    // Validate passwords if they are being changed
    if (profileData.newPassword || profileData.confirmPassword) {
      if (profileData.newPassword !== profileData.confirmPassword) {
        alert('New passwords do not match!');
        return;
      }
      if (profileData.newPassword.length < 6) {
        alert('New password must be at least 6 characters long!');
        return;
      }
    }

    // Save to localStorage for current user only
    saveProfileData(profileData);
    setIsSaved(true);
    
    // Clear password fields after save for security
    setProfileData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));

    // Show success message with visual feedback
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  const handleCancel = () => {
    // Reload saved data from localStorage for current user only
    const savedProfile = localStorage.getItem(getStorageKey());
    if (savedProfile) {
      try {
        const parsedData = JSON.parse(savedProfile);
        setProfileData(prev => ({
          ...prev,
          ...parsedData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } catch (error) {
        // Reset to empty if no saved data
        setProfileData({
          firstName: '',
          lastName: '',
          birthday: '',
          country: '',
          city: '',
          email: gameState.company?.email || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    }
    setIsSaved(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
        <p className="text-slate-400">
          Update your personal details and account information
        </p>
      </div>

      {/* Personal Information */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={profileData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="Enter first name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={profileData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="Enter last name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Birthday Date
            </label>
            <input
              type="date"
              value={profileData.birthday}
              onChange={(e) => handleInputChange('birthday', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Country
            </label>
            <select
              value={profileData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select country</option>
              <option value="Afghanistan">Afghanistan</option>
              <option value="Albania">Albania</option>
              <option value="Algeria">Algeria</option>
              <option value="Andorra">Andorra</option>
              <option value="Angola">Angola</option>
              <option value="Antigua and Barbuda">Antigua and Barbuda</option>
              <option value="Argentina">Argentina</option>
              <option value="Armenia">Armenia</option>
              <option value="Australia">Australia</option>
              <option value="Austria">Austria</option>
              <option value="Azerbaijan">Azerbaijan</option>
              <option value="Bahamas">Bahamas</option>
              <option value="Bahrain">Bahrain</option>
              <option value="Bangladesh">Bangladesh</option>
              <option value="Barbados">Barbados</option>
              <option value="Belarus">Belarus</option>
              <option value="Belgium">Belgium</option>
              <option value="Belize">Belize</option>
              <option value="Benin">Benin</option>
              <option value="Bhutan">Bhutan</option>
              <option value="Bolivia">Bolivia</option>
              <option value="Bosnia and Herzegovina">Bosnia and Herzegovina</option>
              <option value="Botswana">Botswana</option>
              <option value="Brazil">Brazil</option>
              <option value="Brunei">Brunei</option>
              <option value="Bulgaria">Bulgaria</option>
              <option value="Burkina Faso">Burkina Faso</option>
              <option value="Burundi">Burundi</option>
              <option value="Cabo Verde">Cabo Verde</option>
              <option value="Cambodia">Cambodia</option>
              <option value="Cameroon">Cameroon</option>
              <option value="Canada">Canada</option>
              <option value="Central African Republic">Central African Republic</option>
              <option value="Chad">Chad</option>
              <option value="Chile">Chile</option>
              <option value="China">China</option>
              <option value="Colombia">Colombia</option>
              <option value="Comoros">Comoros</option>
              <option value="Congo">Congo</option>
              <option value="Costa Rica">Costa Rica</option>
              <option value="Croatia">Croatia</option>
              <option value="Cuba">Cuba</option>
              <option value="Cyprus">Cyprus</option>
              <option value="Czech Republic">Czech Republic</option>
              <option value="Denmark">Denmark</option>
              <option value="Djibouti">Djibouti</option>
              <option value="Dominica">Dominica</option>
              <option value="Dominican Republic">Dominican Republic</option>
              <option value="East Timor">East Timor</option>
              <option value="Ecuador">Ecuador</option>
              <option value="Egypt">Egypt</option>
              <option value="El Salvador">El Salvador</option>
              <option value="Equatorial Guinea">Equatorial Guinea</option>
              <option value="Eritrea">Eritrea</option>
              <option value="Estonia">Estonia</option>
              <option value="Eswatini">Eswatini</option>
              <option value="Ethiopia">Ethiopia</option>
              <option value="Fiji">Fiji</option>
              <option value="Finland">Finland</option>
              <option value="France">France</option>
              <option value="Gabon">Gabon</option>
              <option value="Gambia">Gambia</option>
              <option value="Georgia">Georgia</option>
              <option value="Germany">Germany</option>
              <option value="Ghana">Ghana</option>
              <option value="Greece">Greece</option>
              <option value="Grenada">Grenada</option>
              <option value="Guatemala">Guatemala</option>
              <option value="Guinea">Guinea</option>
              <option value="Guinea-Bissau">Guinea-Bissau</option>
              <option value="Guyana">Guyana</option>
              <option value="Haiti">Haiti</option>
              <option value="Honduras">Honduras</option>
              <option value="Hungary">Hungary</option>
              <option value="Iceland">Iceland</option>
              <option value="India">India</option>
              <option value="Indonesia">Indonesia</option>
              <option value="Iran">Iran</option>
              <option value="Iraq">Iraq</option>
              <option value="Ireland">Ireland</option>
              <option value="Israel">Israel</option>
              <option value="Italy">Italy</option>
              <option value="Jamaica">Jamaica</option>
              <option value="Japan">Japan</option>
              <option value="Jordan">Jordan</option>
              <option value="Kazakhstan">Kazakhstan</option>
              <option value="Kenya">Kenya</option>
              <option value="Kiribati">Kiribati</option>
              <option value="Korea, North">Korea, North</option>
              <option value="Korea, South">Korea, South</option>
              <option value="Kosovo">Kosovo</option>
              <option value="Kuwait">Kuwait</option>
              <option value="Kyrgyzstan">Kyrgyzstan</option>
              <option value="Laos">Laos</option>
              <option value="Latvia">Latvia</option>
              <option value="Lebanon">Lebanon</option>
              <option value="Lesotho">Lesotho</option>
              <option value="Liberia">Liberia</option>
              <option value="Libya">Libya</option>
              <option value="Liechtenstein">Liechtenstein</option>
              <option value="Lithuania">Lithuania</option>
              <option value="Luxembourg">Luxembourg</option>
              <option value="Madagascar">Madagascar</option>
              <option value="Malawi">Malawi</option>
              <option value="Malaysia">Malaysia</option>
              <option value="Maldives">Maldives</option>
              <option value="Mali">Mali</option>
              <option value="Malta">Malta</option>
              <option value="Marshall Islands">Marshall Islands</option>
              <option value="Mauritania">Mauritania</option>
              <option value="Mauritius">Mauritius</option>
              <option value="Mexico">Mexico</option>
              <option value="Micronesia">Micronesia</option>
              <option value="Moldova">Moldova</option>
              <option value="Monaco">Monaco</option>
              <option value="Mongolia">Mongolia</option>
              <option value="Montenegro">Montenegro</option>
              <option value="Morocco">Morocco</option>
              <option value="Mozambique">Mozambique</option>
              <option value="Myanmar">Myanmar</option>
              <option value="Namibia">Namibia</option>
              <option value="Nauru">Nauru</option>
              <option value="Nepal">Nepal</option>
              <option value="Netherlands">Netherlands</option>
              <option value="New Zealand">New Zealand</option>
              <option value="Nicaragua">Nicaragua</option>
              <option value="Niger">Niger</option>
              <option value="Nigeria">Nigeria</option>
              <option value="North Macedonia">North Macedonia</option>
              <option value="Norway">Norway</option>
              <option value="Oman">Oman</option>
              <option value="Pakistan">Pakistan</option>
              <option value="Palau">Palau</option>
              <option value="Palestine">Palestine</option>
              <option value="Panama">Panama</option>
              <option value="Papua New Guinea">Papua New Guinea</option>
              <option value="Paraguay">Paraguay</option>
              <option value="Peru">Peru</option>
              <option value="Philippines">Philippines</option>
              <option value="Poland">Poland</option>
              <option value="Portugal">Portugal</option>
              <option value="Qatar">Qatar</option>
              <option value="Romania">Romania</option>
              <option value="Russia">Russia</option>
              <option value="Rwanda">Rwanda</option>
              <option value="Saint Kitts and Nevis">Saint Kitts and Nevis</option>
              <option value="Saint Lucia">Saint Lucia</option>
              <option value="Saint Vincent and the Grenadines">Saint Vincent and the Grenadines</option>
              <option value="Samoa">Samoa</option>
              <option value="San Marino">San Marino</option>
              <option value="Sao Tome and Principe">Sao Tome and Principe</option>
              <option value="Saudi Arabia">Saudi Arabia</option>
              <option value="Senegal">Senegal</option>
              <option value="Serbia">Serbia</option>
              <option value="Seychelles">Seychelles</option>
              <option value="Sierra Leone">Sierra Leone</option>
              <option value="Singapore">Singapore</option>
              <option value="Slovakia">Slovakia</option>
              <option value="Slovenia">Slovenia</option>
              <option value="Solomon Islands">Solomon Islands</option>
              <option value="Somalia">Somalia</option>
              <option value="South Africa">South Africa</option>
              <option value="South Sudan">South Sudan</option>
              <option value="Spain">Spain</option>
              <option value="Sri Lanka">Sri Lanka</option>
              <option value="Sudan">Sudan</option>
              <option value="Suriname">Suriname</option>
              <option value="Sweden">Sweden</option>
              <option value="Switzerland">Switzerland</option>
              <option value="Syria">Syria</option>
              <option value="Taiwan">Taiwan</option>
              <option value="Tajikistan">Tajikistan</option>
              <option value="Tanzania">Tanzania</option>
              <option value="Thailand">Thailand</option>
              <option value="Togo">Togo</option>
              <option value="Tonga">Tonga</option>
              <option value="Trinidad and Tobago">Trinidad and Tobago</option>
              <option value="Tunisia">Tunisia</option>
              <option value="Turkey">Turkey</option>
              <option value="Turkmenistan">Turkmenistan</option>
              <option value="Tuvalu">Tuvalu</option>
              <option value="Uganda">Uganda</option>
              <option value="Ukraine">Ukraine</option>
              <option value="United Arab Emirates">United Arab Emirates</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="United States">United States</option>
              <option value="Uruguay">Uruguay</option>
              <option value="Uzbekistan">Uzbekistan</option>
              <option value="Vanuatu">Vanuatu</option>
              <option value="Vatican City">Vatican City</option>
              <option value="Venezuela">Venezuela</option>
              <option value="Vietnam">Vietnam</option>
              <option value="Yemen">Yemen</option>
              <option value="Zambia">Zambia</option>
              <option value="Zimbabwe">Zimbabwe</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              City
            </label>
            <input
              type="text"
              value={profileData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="Enter city"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="your@email.com"
            />
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h4 className="text-lg font-bold text-white mb-4">Change Password</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={profileData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={profileData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={profileData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="Confirm new password"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={handleCancel}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveChanges}
          className={`px-6 py-3 rounded-lg transition-colors font-medium ${
            isSaved 
              ? 'bg-green-600 text-white cursor-default' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSaved ? '✓ Changes Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default Profile;