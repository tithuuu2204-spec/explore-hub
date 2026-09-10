import React, { useState, useEffect } from 'react';
import { 
  Search, MapPin, Sparkles, Clock, Users, Navigation, 
  PlusCircle, Loader2, CheckCircle2, ArrowLeft, IndianRupee, 
  UserCircle, Image as ImageIcon, LogOut 
} from 'lucide-react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';

const CLOUDINARY_CLOUD_NAME = 'ixqxikbv';
const CLOUDINARY_UPLOAD_PRESET = 'explorehub_preset';

const CATEGORIES = ['Culture', 'Heritage', 'Food', 'Adventure', 'Workshop', 'Nature'];
const BUDGETS = ['Budget-Friendly', 'Moderate (Standard 3-Star)', 'Luxury'];

const emptyHostForm = { 
  title: '', 
  location: '', 
  date: '', 
  time: '', 
  price: '', 
  capacity: '', 
  category: 'Culture', 
  description: '',
  gst: '', 
  aadhaar: '', 
  photoFile: null,
  photoPreview: ''
};

export default function App() {
  const [view, setView] = useState('home');
  const [experiences, setExperiences] = useState([]);
  const [loadingExp, setLoadingExp] = useState(true);
  const [search, setSearch] = useState({ where: '', what: '' });
  const [user, setUser] = useState(null);

  // Host form states
  const [hostForm, setHostForm] = useState(emptyHostForm);
  const [uploading, setUploading] = useState(false);
  const [hostError, setHostError] = useState('');

  // 1. Listen for user sign-in / sign-out
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch live listings from Firestore
  const fetchExperiencesFromDb = async () => {
    setLoadingExp(true);
    try {
      const q = query(collection(db, 'experiences'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExperiences(items);
    } catch (err) {
      console.error('Error fetching experiences:', err);
    } finally {
      setLoadingExp(false);
    }
  };

  useEffect(() => {
    fetchExperiencesFromDb();
  }, []);

  // Google Login popup
  async function handleGoogleLogin() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign-in error:', err);
      alert('Sign-in failed. Make sure Google provider is enabled in Firebase Authentication.');
    }
  }

  // Sign out
  async function handleLogout() {
    await signOut(auth);
    setView('home');
  }

  // Handle Photo Picker
  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (file) {
      setHostForm(f => ({
        ...f,
        photoFile: file,
        photoPreview: URL.createObjectURL(file)
      }));
    }
  }

  // Upload to Cloudinary & Save to Firestore
  async function handleHostSubmit(e) {
    e.preventDefault();
    if (!user) {
      alert('Please log in with Google first.');
      return;
    }
    if (!hostForm.photoFile) {
      setHostError('Please select a photo for your experience.');
      return;
    }

    setUploading(true);
    setHostError('');

    try {
      // Step A: Upload image to Cloudinary
      const formData = new FormData();
      formData.append('file', hostForm.photoFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!cloudRes.ok) throw new Error('Cloudinary image upload failed.');
      const cloudData = await cloudRes.json();
      const uploadedImageUrl = cloudData.secure_url;

      // Step B: Save to Firebase Firestore Database
      await addDoc(collection(db, 'experiences'), {
        title: hostForm.title,
        location: hostForm.location,
        date: hostForm.date,
        time: hostForm.time,
        price: Number(hostForm.price),
        capacity: hostForm.capacity ? Number(hostForm.capacity) : null,
        category: hostForm.category,
        description: hostForm.description,
        gst: hostForm.gst,
        aadhaar: hostForm.aadhaar,
        image: uploadedImageUrl,
        hostId: user.uid,
        hostName: user.displayName,
        hostEmail: user.email,
        createdAt: serverTimestamp()
      });

      setHostForm(emptyHostForm);
      await fetchExperiencesFromDb();
      setView('home');
    } catch (err) {
      console.error(err);
      setHostError(err.message || 'Error publishing listing.');
    } finally {
      setUploading(false);
    }
  }

  // Filter listings
  const filteredExperiences = experiences.filter(exp => {
    const matchWhere = exp.location?.toLowerCase().includes(search.where.toLowerCase());
    const matchWhat = exp.category?.toLowerCase().includes(search.what.toLowerCase()) || 
                      exp.title?.toLowerCase().includes(search.what.toLowerCase());
    return matchWhere && matchWhat;
  });

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <button 
          className="flex items-center gap-2 text-orange-600 font-semibold text-2xl" 
          onClick={() => setView('home')}
        >
          <Navigation className="w-7 h-7" strokeWidth={2.2} />
          ExploreHub
        </button>

        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <button onClick={() => setView('home')} className="hidden md:block hover:text-orange-600">Discover</button>
          <button onClick={() => setView('host')} className="hidden md:block hover:text-orange-600">Host an Experience</button>

          {user ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView('profile')} 
                className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition"
              >
                <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full" />
                <span className="hidden sm:inline">{user.displayName}</span>
              </button>
              <button onClick={handleLogout} title="Sign Out" className="text-slate-400 hover:text-red-500">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleGoogleLogin} 
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <UserCircle className="w-5 h-5" /> Sign in with Google
            </button>
          )}
        </div>
      </nav>

      {/* User Account / Profile View */}
      {view === 'profile' && user && (
        <div className="max-w-4xl mx-auto px-6 py-12">
          <button onClick={() => setView('home')} className="flex items-center gap-1 text-slate-500 mb-6 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Back to Discover
          </button>
          <h2 className="text-3xl font-semibold mb-6">Account Overview</h2>
          <div className="bg-white p-6 rounded-xl border border-stone-200 mb-8 flex items-center gap-6">
            <img src={user.photoURL} alt="Avatar" className="w-20 h-20 rounded-full border border-stone-200" />
            <div>
              <h3 className="text-xl font-bold">{user.displayName}</h3>
              <p className="text-slate-500">{user.email}</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4">Your Hosted Experiences</h3>
          {experiences.filter(exp => exp.hostId === user.uid).length === 0 ? (
            <p className="text-slate-500">You haven't listed any experiences yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {experiences.filter(exp => exp.hostId === user.uid).map(list => (
                <div key={list.id} className="p-4 bg-white border border-stone-200 rounded-lg flex gap-4">
                  <img src={list.image} alt={list.title} className="w-24 h-24 object-cover rounded-md" />
                  <div>
                    <h4 className="font-bold">{list.title}</h4>
                    <p className="text-sm text-slate-500">{list.location}</p>
                    <p className="text-sm font-semibold mt-2 text-orange-600">₹{list.price} / person</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Home / Discover Feed */}
      {view === 'home' && (
        <main>
          <div className="bg-gradient-to-br from-orange-600 to-amber-500 text-white py-20 px-6 text-center">
            <h1 className="text-4xl md:text-5xl font-semibold mb-4">Discover India's Local Experiences</h1>
            <p className="text-lg md:text-xl mb-10 max-w-xl mx-auto opacity-90">From local experiences to complete journeys.</p>
            
            <form onSubmit={(e) => e.preventDefault()} className="bg-white rounded-full p-2 max-w-3xl mx-auto flex flex-col md:flex-row shadow-xl text-left gap-2">
              <div className="flex items-center flex-1 px-4 py-2 border-b md:border-b-0 md:border-r border-slate-200">
                <MapPin className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Where? (City or location)" 
                  value={search.where} 
                  onChange={(e) => setSearch({ ...search, where: e.target.value })} 
                  className="w-full outline-none text-slate-800" 
                />
              </div>
              <div className="flex items-center flex-1 px-4 py-2">
                <Search className="text-slate-400 w-5 h-5 mr-3 shrink-0" />
                <input 
                  type="text" 
                  placeholder="What? (Category or activity)" 
                  value={search.what} 
                  onChange={(e) => setSearch({ ...search, what: e.target.value })} 
                  className="w-full outline-none text-slate-800" 
                />
              </div>
              <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-full font-semibold hover:bg-slate-800 transition">
                Explore
              </button>
            </form>
          </div>

          <div className="max-w-6xl mx-auto px-6 py-16">
            <h2 className="text-2xl font-semibold mb-8">All Local Experiences</h2>
            
            {loadingExp && (
              <div className="flex items-center justify-center gap-2 text-slate-500 py-12">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading experiences…
              </div>
            )}

            {!loadingExp && filteredExperiences.length === 0 && (
              <p className="text-slate-500">No experiences listed yet. Be the first to host one!</p>
            )}

            {!loadingExp && filteredExperiences.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {filteredExperiences.map((exp) => (
                  <div key={exp.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md transition">
                    <div className="h-48 bg-slate-200 relative overflow-hidden">
                      <img src={exp.image} alt={exp.title} className="object-cover w-full h-full" />
                      <span className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-xs font-semibold text-orange-600">
                        {exp.category}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-xl mb-2">{exp.title}</h3>
                      <div className="flex items-center text-slate-500 text-sm mb-1">
                        <MapPin className="w-4 h-4 mr-1 shrink-0" /> {exp.location}
                      </div>
                      <div className="flex items-center text-slate-500 text-sm mb-4">
                        <Clock className="w-4 h-4 mr-1 shrink-0" /> {exp.time || 'Flexible'}
                      </div>
                      <p className="text-slate-600 text-sm mb-6 line-clamp-2">{exp.description}</p>
                      <div className="flex items-center justify-between border-t border-stone-100 pt-4">
                        <span className="font-semibold text-lg">₹{exp.price}</span>
                        <span className="text-xs text-slate-400">Host: {exp.hostName || 'Local'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* Host an Experience Form */}
      {view === 'host' && (
        <div className="max-w-2xl mx-auto px-6 py-12">
          <button onClick={() => setView('home')} className="flex items-center gap-1 text-slate-500 mb-6 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Back to Discover
          </button>

          {!user ? (
            <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center">
              <h2 className="text-2xl font-semibold mb-2">Please Sign In</h2>
              <p className="text-slate-500 mb-6 text-sm">You need to sign in with your Google account to host an experience.</p>
              <button 
                onClick={handleGoogleLogin} 
                className="bg-blue-600 text-white px-6 py-3 rounded-xl inline-flex items-center gap-2 hover:bg-blue-700 transition"
              >
                <UserCircle className="w-5 h-5" /> Sign in with Google
              </button>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-stone-200">
              <div className="flex items-center justify-center w-14 h-14 bg-orange-100 text-orange-600 rounded-full mb-5">
                <PlusCircle className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-semibold mb-1">List a Local Experience</h2>
              <p className="text-slate-500 mb-8 text-sm">Upload details, verification numbers, and a photo of your event.</p>

              <form onSubmit={handleHostSubmit} className="space-y-5">
                {/* Photo Upload Box - FIXED BUG HERE */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Event Photo</label>
                  <label 
                    htmlFor="event-photo-upload"
                    className="border-2 border-dashed border-stone-300 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-stone-50 transition cursor-pointer"
                  >
                    {hostForm.photoPreview ? (
                      <img src={hostForm.photoPreview} alt="Preview" className="h-44 object-cover rounded-lg" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-600 font-medium">Click to select an image</span>
                      </div>
                    )}
                  </label>
                  <input 
                    id="event-photo-upload"
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoSelect} 
                    className="hidden" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Experience Title</label>
                  <input 
                    required 
                    value={hostForm.title} 
                    onChange={(e) => setHostForm({ ...hostForm, title: e.target.value })} 
                    placeholder="e.g. Traditional Gujarati Garba Workshop" 
                    className="w-full border border-stone-200 rounded-lg px-4 py-3 bg-stone-50" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Location / City</label>
                    <input 
                      required 
                      value={hostForm.location} 
                      onChange={(e) => setHostForm({ ...hostForm, location: e.target.value })} 
                      placeholder="City, State" 
                      className="w-full border border-stone-200 rounded-lg px-4 py-3 bg-stone-50" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Category</label>
                    <select 
                      value={hostForm.category} 
                      onChange={(e) => setHostForm({ ...hostForm, category: e.target.value })} 
                      className="w-full border border-stone-200 rounded-lg px-4 py-3 bg-stone-50"
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Date</label>
                    <input 
                      value={hostForm.date} 
                      onChange={(e) => setHostForm({ ...hostForm, date: e.target.value })} 
                      placeholder="e.g. 20 Oct" 
                      className="w-full border border-stone-200 rounded-lg px-4 py-3 bg-stone-50" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Timing</label>
                    <input 
                      value={hostForm.time} 
                      onChange={(e) => setHostForm({ ...hostForm, time: e.target.value })} 
                      placeholder="e.g. 7:00 PM - 10:00 PM" 
                      className="w-full border border-stone-200 rounded-lg px-4 py-3 bg-stone-50" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Price per person (₹)</label>
                    <input 
                      required 
                      type="number" 
                      min="0" 
                      value={hostForm.price} 
                      onChange={(e) => setHostForm({ ...hostForm, price: e.target.value })} 
                      className="w-full border border-stone-200 rounded-lg px-4 py-3 bg-stone-50" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Capacity</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={hostForm.capacity} 
                      onChange={(e) => setHostForm({ ...hostForm, capacity: e.target.value })} 
                      placeholder="Max people" 
                      className="w-full border border-stone-200 rounded-lg px-4 py-3 bg-stone-50" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">GST Number</label>
                    <input 
                      required 
                      value={hostForm.gst} 
                      onChange={(e) => setHostForm({ ...hostForm, gst: e.target.value })} 
                      placeholder="15-digit GSTIN" 
                      className="w-full border border-stone-200 rounded-lg px-4 py-3 bg-stone-50" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Aadhaar Card Number</label>
                    <input 
                      required 
                      type="password" 
                      maxLength="12"
                      value={hostForm.aadhaar} 
                      onChange={(e) => setHostForm({ ...hostForm, aadhaar: e.target.value })} 
                      placeholder="12-digit number" 
                      className="w-full border border-stone-200 rounded-lg px-4 py-3 bg-stone-50" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Description</label>
                  <textarea 
                    rows={3} 
                    value={hostForm.description} 
                    onChange={(e) => setHostForm({ ...hostForm, description: e.target.value })} 
                    className="w-full border border-stone-200 rounded-lg px-4 py-3 bg-stone-50" 
                  />
                </div>

                {hostError && <p className="text-sm text-red-600">{hostError}</p>}

                <button 
                  type="submit" 
                  disabled={uploading} 
                  className="w-full bg-orange-600 text-white font-semibold py-3 rounded-xl hover:bg-orange-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Uploading image & publishing...
                    </>
                  ) : (
                    'Publish Listing'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}