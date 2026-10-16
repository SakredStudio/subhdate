// Offline city list: hand-curated (name, region, lat, lon, IANA tz). Coordinates to ~0.01 deg, which moves
// sunrise by a few seconds at most. GeoNames import (CC BY 4.0) is the planned v1.1 upgrade (research/03 §4).
export interface City { name: string; region: string; lat: number; lon: number; tz: string; alt?: string[]; }
const IN = 'Asia/Kolkata';
const c = (name: string, region: string, lat: number, lon: number, tz = IN, alt?: string[]): City => ({ name, region, lat, lon, tz, alt });
export const CITIES: City[] = [
  // India: capitals and major cities
  c('New Delhi', 'Delhi', 28.6139, 77.2090, IN, ['Delhi', 'दिल्ली']), c('Mumbai', 'Maharashtra', 19.0760, 72.8777, IN, ['Bombay', 'मुंबई']), c('Kolkata', 'West Bengal', 22.5726, 88.3639, IN, ['Calcutta', 'কলকাতা']),
  c('Chennai', 'Tamil Nadu', 13.0827, 80.2707, IN, ['Madras', 'சென்னை']), c('Bengaluru', 'Karnataka', 12.9716, 77.5946, IN, ['Bangalore', 'ಬೆಂಗಳೂರು']), c('Hyderabad', 'Telangana', 17.3850, 78.4867, IN, ['హైదరాబాద్']),
  c('Ahmedabad', 'Gujarat', 23.0225, 72.5714, IN, ['અમદાવાદ']), c('Pune', 'Maharashtra', 18.5204, 73.8567, IN, ['पुणे']), c('Surat', 'Gujarat', 21.1702, 72.8311, IN, ['સુરત']), c('Jaipur', 'Rajasthan', 26.9124, 75.7873, IN, ['जयपुर']),
  c('Lucknow', 'Uttar Pradesh', 26.8467, 80.9462, IN, ['लखनऊ']), c('Kanpur', 'Uttar Pradesh', 26.4499, 80.3319), c('Nagpur', 'Maharashtra', 21.1458, 79.0882), c('Indore', 'Madhya Pradesh', 22.7196, 75.8577), c('Bhopal', 'Madhya Pradesh', 23.2599, 77.4126),
  c('Thane', 'Maharashtra', 19.2183, 72.9781), c('Visakhapatnam', 'Andhra Pradesh', 17.6868, 83.2185), c('Patna', 'Bihar', 25.5941, 85.1376), c('Vadodara', 'Gujarat', 22.3072, 73.1812, IN, ['Baroda', 'વડોદરા']), c('Ghaziabad', 'Uttar Pradesh', 28.6692, 77.4538),
  c('Ludhiana', 'Punjab', 30.9010, 75.8573), c('Agra', 'Uttar Pradesh', 27.1767, 78.0081), c('Nashik', 'Maharashtra', 19.9975, 73.7898), c('Faridabad', 'Haryana', 28.4089, 77.3178), c('Meerut', 'Uttar Pradesh', 28.9845, 77.7064),
  c('Rajkot', 'Gujarat', 22.3039, 70.8022, IN, ['રાજકોટ']), c('Varanasi', 'Uttar Pradesh', 25.3176, 82.9739, IN, ['Kashi', 'Banaras', 'वाराणसी']), c('Srinagar', 'Jammu and Kashmir', 34.0837, 74.7973), c('Aurangabad', 'Maharashtra', 19.8762, 75.3433), c('Dhanbad', 'Jharkhand', 23.7957, 86.4304),
  c('Amritsar', 'Punjab', 31.6340, 74.8723), c('Navi Mumbai', 'Maharashtra', 19.0330, 73.0297), c('Prayagraj', 'Uttar Pradesh', 25.4358, 81.8463, IN, ['Allahabad']), c('Ranchi', 'Jharkhand', 23.3441, 85.3096), c('Howrah', 'West Bengal', 22.5958, 88.2636),
  c('Coimbatore', 'Tamil Nadu', 11.0168, 76.9558), c('Jabalpur', 'Madhya Pradesh', 23.1815, 79.9864), c('Gwalior', 'Madhya Pradesh', 26.2183, 78.1828), c('Vijayawada', 'Andhra Pradesh', 16.5062, 80.6480), c('Jodhpur', 'Rajasthan', 26.2389, 73.0243),
  c('Madurai', 'Tamil Nadu', 9.9252, 78.1198), c('Raipur', 'Chhattisgarh', 21.2514, 81.6296), c('Kota', 'Rajasthan', 25.2138, 75.8648), c('Guwahati', 'Assam', 26.1445, 91.7362), c('Chandigarh', 'Chandigarh', 30.7333, 76.7794),
  c('Thiruvananthapuram', 'Kerala', 8.5241, 76.9366, IN, ['Trivandrum']), c('Solapur', 'Maharashtra', 17.6599, 75.9064), c('Hubballi-Dharwad', 'Karnataka', 15.3647, 75.1240, IN, ['Hubli']), c('Tiruchirappalli', 'Tamil Nadu', 10.7905, 78.7047, IN, ['Trichy']), c('Bareilly', 'Uttar Pradesh', 28.3670, 79.4304),
  c('Mysuru', 'Karnataka', 12.2958, 76.6394, IN, ['Mysore']), c('Tiruppur', 'Tamil Nadu', 11.1085, 77.3411), c('Gurugram', 'Haryana', 28.4595, 77.0266, IN, ['Gurgaon']), c('Aligarh', 'Uttar Pradesh', 27.8974, 78.0880), c('Jalandhar', 'Punjab', 31.3260, 75.5762),
  c('Bhubaneswar', 'Odisha', 20.2961, 85.8245), c('Salem', 'Tamil Nadu', 11.6643, 78.1460), c('Warangal', 'Telangana', 17.9689, 79.5941), c('Guntur', 'Andhra Pradesh', 16.3067, 80.4365), c('Bhiwandi', 'Maharashtra', 19.2967, 73.0631),
  c('Saharanpur', 'Uttar Pradesh', 29.9680, 77.5510), c('Gorakhpur', 'Uttar Pradesh', 26.7606, 83.3732), c('Bikaner', 'Rajasthan', 28.0229, 73.3119), c('Amravati', 'Maharashtra', 20.9374, 77.7796), c('Noida', 'Uttar Pradesh', 28.5355, 77.3910),
  c('Jamshedpur', 'Jharkhand', 22.8046, 86.2029), c('Bhilai', 'Chhattisgarh', 21.1938, 81.3509), c('Cuttack', 'Odisha', 20.4625, 85.8830), c('Firozabad', 'Uttar Pradesh', 27.1591, 78.3957), c('Kochi', 'Kerala', 9.9312, 76.2673, IN, ['Cochin']),
  c('Bhavnagar', 'Gujarat', 21.7645, 72.1519, IN, ['ભાવનગર']), c('Dehradun', 'Uttarakhand', 30.3165, 78.0322), c('Durgapur', 'West Bengal', 23.5204, 87.3119), c('Asansol', 'West Bengal', 23.6889, 86.9661), c('Nanded', 'Maharashtra', 19.1383, 77.3210),
  c('Kolhapur', 'Maharashtra', 16.7050, 74.2433), c('Ajmer', 'Rajasthan', 26.4499, 74.6399), c('Gulbarga', 'Karnataka', 17.3297, 76.8343), c('Jamnagar', 'Gujarat', 22.4707, 70.0577, IN, ['જામનગર']), c('Ujjain', 'Madhya Pradesh', 23.1765, 75.7885, IN, ['उज्जैन']),
  c('Loni', 'Uttar Pradesh', 28.7500, 77.2833), c('Siliguri', 'West Bengal', 26.7271, 88.3953), c('Jhansi', 'Uttar Pradesh', 25.4484, 78.5685), c('Ulhasnagar', 'Maharashtra', 19.2215, 73.1645), c('Jammu', 'Jammu and Kashmir', 32.7266, 74.8570),
  c('Sangli', 'Maharashtra', 16.8524, 74.5815), c('Mangaluru', 'Karnataka', 12.9141, 74.8560, IN, ['Mangalore']), c('Erode', 'Tamil Nadu', 11.3410, 77.7172), c('Belagavi', 'Karnataka', 15.8497, 74.4977, IN, ['Belgaum']), c('Ambattur', 'Tamil Nadu', 13.1143, 80.1548),
  c('Tirunelveli', 'Tamil Nadu', 8.7139, 77.7567), c('Malegaon', 'Maharashtra', 20.5579, 74.5287), c('Gaya', 'Bihar', 24.7955, 85.0002), c('Jalgaon', 'Maharashtra', 21.0077, 75.5626), c('Udaipur', 'Rajasthan', 24.5854, 73.7125),
  c('Maheshtala', 'West Bengal', 22.5089, 88.2475), c('Tirupati', 'Andhra Pradesh', 13.6288, 79.4192), c('Davanagere', 'Karnataka', 14.4644, 75.9218), c('Kozhikode', 'Kerala', 11.2588, 75.7804, IN, ['Calicut']), c('Akola', 'Maharashtra', 20.7002, 77.0082),
  c('Kurnool', 'Andhra Pradesh', 15.8281, 78.0373), c('Rajpur Sonarpur', 'West Bengal', 22.4497, 88.4096), c('Bokaro', 'Jharkhand', 23.6693, 86.1511), c('South Dumdum', 'West Bengal', 22.6100, 88.4000), c('Bellary', 'Karnataka', 15.1394, 76.9214),
  c('Patiala', 'Punjab', 30.3398, 76.3869), c('Gopalpur', 'West Bengal', 22.6700, 88.3700), c('Agartala', 'Tripura', 23.8315, 91.2868), c('Bhagalpur', 'Bihar', 25.2425, 86.9842), c('Muzaffarnagar', 'Uttar Pradesh', 29.4727, 77.7085),
  c('Bhatpara', 'West Bengal', 22.8664, 88.4011), c('Panihati', 'West Bengal', 22.6900, 88.3700), c('Latur', 'Maharashtra', 18.4088, 76.5604), c('Dhule', 'Maharashtra', 20.9042, 74.7749), c('Rohtak', 'Haryana', 28.8955, 76.6066),
  c('Korba', 'Chhattisgarh', 22.3595, 82.7501), c('Bhilwara', 'Rajasthan', 25.3407, 74.6313), c('Brahmapur', 'Odisha', 19.3150, 84.7941), c('Muzaffarpur', 'Bihar', 26.1209, 85.3647), c('Ahmednagar', 'Maharashtra', 19.0948, 74.7480),
  c('Mathura', 'Uttar Pradesh', 27.4924, 77.6737, IN, ['मथुरा']), c('Kollam', 'Kerala', 8.8932, 76.6141), c('Avadi', 'Tamil Nadu', 13.1147, 80.1098), c('Kadapa', 'Andhra Pradesh', 14.4674, 78.8241), c('Kamarhati', 'West Bengal', 22.6711, 88.3747),
  c('Sambalpur', 'Odisha', 21.4669, 83.9812), c('Bilaspur', 'Chhattisgarh', 22.0797, 82.1409), c('Shahjahanpur', 'Uttar Pradesh', 27.8815, 79.9106), c('Satara', 'Maharashtra', 17.6805, 74.0183), c('Bijapur', 'Karnataka', 16.8302, 75.7100),
  c('Rampur', 'Uttar Pradesh', 28.8152, 79.0250), c('Shivamogga', 'Karnataka', 13.9299, 75.5681, IN, ['Shimoga']), c('Chandrapur', 'Maharashtra', 19.9615, 79.2961), c('Junagadh', 'Gujarat', 21.5222, 70.4579, IN, ['જૂનાગઢ']), c('Thrissur', 'Kerala', 10.5276, 76.2144),
  c('Alwar', 'Rajasthan', 27.5530, 76.6346), c('Bardhaman', 'West Bengal', 23.2324, 87.8615), c('Kulti', 'West Bengal', 23.7300, 86.8500), c('Kakinada', 'Andhra Pradesh', 16.9891, 82.2475), c('Nizamabad', 'Telangana', 18.6725, 78.0941),
  c('Parbhani', 'Maharashtra', 19.2686, 76.7708), c('Tumakuru', 'Karnataka', 13.3379, 77.1173), c('Khammam', 'Telangana', 17.2473, 80.1514), c('Ozhukarai', 'Puducherry', 11.9500, 79.7700), c('Bihar Sharif', 'Bihar', 25.1982, 85.5230),
  c('Panipat', 'Haryana', 29.3909, 76.9635), c('Darbhanga', 'Bihar', 26.1542, 85.8918), c('Bally', 'West Bengal', 22.6500, 88.3400), c('Aizawl', 'Mizoram', 23.7271, 92.7176), c('Dewas', 'Madhya Pradesh', 22.9676, 76.0534),
  c('Ichalkaranji', 'Maharashtra', 16.6910, 74.4605), c('Karnal', 'Haryana', 29.6857, 76.9905), c('Bathinda', 'Punjab', 30.2110, 74.9455), c('Jalna', 'Maharashtra', 19.8347, 75.8816), c('Eluru', 'Andhra Pradesh', 16.7107, 81.0952),
  c('Kirari Suleman Nagar', 'Delhi', 28.7300, 77.0700), c('Barasat', 'West Bengal', 22.7200, 88.4800), c('Purnia', 'Bihar', 25.7771, 87.4753), c('Satna', 'Madhya Pradesh', 24.6005, 80.8322), c('Mau', 'Uttar Pradesh', 25.9417, 83.5611),
  c('Sonipat', 'Haryana', 28.9931, 77.0151), c('Farrukhabad', 'Uttar Pradesh', 27.3929, 79.5800), c('Sagar', 'Madhya Pradesh', 23.8388, 78.7378), c('Rourkela', 'Odisha', 22.2604, 84.8536), c('Durg', 'Chhattisgarh', 21.1904, 81.2849),
  c('Imphal', 'Manipur', 24.8170, 93.9368), c('Ratlam', 'Madhya Pradesh', 23.3315, 75.0367), c('Hapur', 'Uttar Pradesh', 28.7306, 77.7759), c('Arrah', 'Bihar', 25.5541, 84.6603), c('Anantapur', 'Andhra Pradesh', 14.6819, 77.6006),
  c('Karimnagar', 'Telangana', 18.4386, 79.1288), c('Etawah', 'Uttar Pradesh', 26.7855, 79.0150), c('Ambernath', 'Maharashtra', 19.1869, 73.1917), c('North Dumdum', 'West Bengal', 22.6500, 88.4200), c('Bharatpur', 'Rajasthan', 27.2152, 77.4900),
  c('Begusarai', 'Bihar', 25.4182, 86.1272), c('Gandhinagar', 'Gujarat', 23.2156, 72.6369, IN, ['ગાંધીનગર']), c('Gandhidham', 'Gujarat', 23.0753, 70.1337), c('Anand', 'Gujarat', 22.5645, 72.9289, IN, ['આણંદ']), c('Nadiad', 'Gujarat', 22.6916, 72.8634, IN, ['નડિયાદ']),
  c('Morbi', 'Gujarat', 22.8173, 70.8370), c('Mehsana', 'Gujarat', 23.5880, 72.3693, IN, ['મહેસાણા']), c('Bharuch', 'Gujarat', 21.7051, 72.9959), c('Navsari', 'Gujarat', 20.9467, 72.9520), c('Porbandar', 'Gujarat', 21.6417, 69.6293),
  c('Dwarka', 'Gujarat', 22.2442, 68.9685, IN, ['દ્વારકા']), c('Somnath', 'Gujarat', 20.8880, 70.4012), c('Palanpur', 'Gujarat', 24.1725, 72.4381), c('Vapi', 'Gujarat', 20.3893, 72.9106), c('Ankleshwar', 'Gujarat', 21.6264, 73.0152),
  c('Shimla', 'Himachal Pradesh', 31.1048, 77.1734), c('Haridwar', 'Uttarakhand', 29.9457, 78.1642, IN, ['हरिद्वार']), c('Rishikesh', 'Uttarakhand', 30.0869, 78.2676), c('Ayodhya', 'Uttar Pradesh', 26.7922, 82.1998, IN, ['अयोध्या']), c('Vrindavan', 'Uttar Pradesh', 27.5650, 77.6593),
  c('Puri', 'Odisha', 19.8135, 85.8312), c('Tirumala', 'Andhra Pradesh', 13.6833, 79.3500), c('Shirdi', 'Maharashtra', 19.7645, 74.4762), c('Nathdwara', 'Rajasthan', 24.9380, 73.8220), c('Pushkar', 'Rajasthan', 26.4897, 74.5511),
  c('Panaji', 'Goa', 15.4909, 73.8278), c('Margao', 'Goa', 15.2832, 73.9862), c('Gangtok', 'Sikkim', 27.3389, 88.6065), c('Shillong', 'Meghalaya', 25.5788, 91.8933), c('Itanagar', 'Arunachal Pradesh', 27.0844, 93.6053),
  c('Kohima', 'Nagaland', 25.6751, 94.1086), c('Dibrugarh', 'Assam', 27.4728, 94.9120), c('Port Blair', 'Andaman and Nicobar', 11.6234, 92.7265), c('Puducherry', 'Puducherry', 11.9416, 79.8083, IN, ['Pondicherry']), c('Vellore', 'Tamil Nadu', 12.9165, 79.1325),
  c('Thanjavur', 'Tamil Nadu', 10.7870, 79.1378), c('Kanchipuram', 'Tamil Nadu', 12.8342, 79.7036), c('Rameswaram', 'Tamil Nadu', 9.2876, 79.3129), c('Kanyakumari', 'Tamil Nadu', 8.0883, 77.5385), c('Guruvayur', 'Kerala', 10.5947, 76.0394),
  // Nepal, Sri Lanka, Bangladesh, Bhutan, Pakistan
  c('Kathmandu', 'Nepal', 27.7172, 85.3240, 'Asia/Kathmandu'), c('Pokhara', 'Nepal', 28.2096, 83.9856, 'Asia/Kathmandu'), c('Biratnagar', 'Nepal', 26.4525, 87.2718, 'Asia/Kathmandu'), c('Janakpur', 'Nepal', 26.7288, 85.9263, 'Asia/Kathmandu'),
  c('Colombo', 'Sri Lanka', 6.9271, 79.8612, 'Asia/Colombo'), c('Jaffna', 'Sri Lanka', 9.6615, 80.0255, 'Asia/Colombo'), c('Kandy', 'Sri Lanka', 7.2906, 80.6337, 'Asia/Colombo'),
  c('Dhaka', 'Bangladesh', 23.8103, 90.4125, 'Asia/Dhaka'), c('Chittagong', 'Bangladesh', 22.3569, 91.7832, 'Asia/Dhaka'), c('Thimphu', 'Bhutan', 27.4728, 89.6390, 'Asia/Thimphu'),
  c('Karachi', 'Pakistan', 24.8607, 67.0011, 'Asia/Karachi'), c('Lahore', 'Pakistan', 31.5204, 74.3587, 'Asia/Karachi'),
  // Canada
  c('Toronto', 'Canada', 43.6532, -79.3832, 'America/Toronto'), c('Brampton', 'Canada', 43.7315, -79.7624, 'America/Toronto'), c('Mississauga', 'Canada', 43.5890, -79.6441, 'America/Toronto'), c('Markham', 'Canada', 43.8561, -79.3370, 'America/Toronto'), c('Scarborough', 'Canada', 43.7731, -79.2578, 'America/Toronto'),
  c('Vaughan', 'Canada', 43.8372, -79.5083, 'America/Toronto'), c('Oakville', 'Canada', 43.4675, -79.6877, 'America/Toronto'), c('Hamilton', 'Canada', 43.2557, -79.8711, 'America/Toronto'), c('Ottawa', 'Canada', 45.4215, -75.6972, 'America/Toronto'), c('Montreal', 'Canada', 45.5017, -73.5673, 'America/Toronto'),
  c('Vancouver', 'Canada', 49.2827, -123.1207, 'America/Vancouver'), c('Surrey', 'Canada', 49.1913, -122.8490, 'America/Vancouver'), c('Burnaby', 'Canada', 49.2488, -122.9805, 'America/Vancouver'), c('Abbotsford', 'Canada', 49.0504, -122.3045, 'America/Vancouver'),
  c('Calgary', 'Canada', 51.0447, -114.0719, 'America/Edmonton'), c('Edmonton', 'Canada', 53.5461, -113.4938, 'America/Edmonton'), c('Winnipeg', 'Canada', 49.8951, -97.1384, 'America/Winnipeg'), c('Saskatoon', 'Canada', 52.1332, -106.6700, 'America/Regina'), c('Halifax', 'Canada', 44.6488, -63.5752, 'America/Halifax'), c('Windsor', 'Canada', 42.3149, -83.0364, 'America/Toronto'), c('London', 'Canada', 42.9849, -81.2453, 'America/Toronto'), c('Kitchener', 'Canada', 43.4516, -80.4925, 'America/Toronto'),
  // USA
  c('New York', 'USA', 40.7128, -74.0060, 'America/New_York'), c('Jersey City', 'USA', 40.7178, -74.0431, 'America/New_York'), c('Edison', 'USA', 40.5187, -74.4121, 'America/New_York'), c('Iselin', 'USA', 40.5754, -74.3224, 'America/New_York'), c('Hicksville', 'USA', 40.7684, -73.5251, 'America/New_York'),
  c('Boston', 'USA', 42.3601, -71.0589, 'America/New_York'), c('Philadelphia', 'USA', 39.9526, -75.1652, 'America/New_York'), c('Washington', 'USA', 38.9072, -77.0369, 'America/New_York'), c('Atlanta', 'USA', 33.7490, -84.3880, 'America/New_York'), c('Charlotte', 'USA', 35.2271, -80.8431, 'America/New_York'),
  c('Raleigh', 'USA', 35.7796, -78.6382, 'America/New_York'), c('Tampa', 'USA', 27.9506, -82.4572, 'America/New_York'), c('Orlando', 'USA', 28.5383, -81.3792, 'America/New_York'), c('Miami', 'USA', 25.7617, -80.1918, 'America/New_York'), c('Detroit', 'USA', 42.3314, -83.0458, 'America/Detroit'),
  c('Columbus', 'USA', 39.9612, -82.9988, 'America/New_York'), c('Pittsburgh', 'USA', 40.4406, -79.9959, 'America/New_York'), c('Chicago', 'USA', 41.8781, -87.6298, 'America/Chicago'), c('Naperville', 'USA', 41.7508, -88.1535, 'America/Chicago'), c('Houston', 'USA', 29.7604, -95.3698, 'America/Chicago'),
  c('Dallas', 'USA', 32.7767, -96.7970, 'America/Chicago'), c('Irving', 'USA', 32.8140, -96.9489, 'America/Chicago'), c('Austin', 'USA', 30.2672, -97.7431, 'America/Chicago'), c('Minneapolis', 'USA', 44.9778, -93.2650, 'America/Chicago'), c('St. Louis', 'USA', 38.6270, -90.1994, 'America/Chicago'),
  c('Denver', 'USA', 39.7392, -104.9903, 'America/Denver'), c('Phoenix', 'USA', 33.4484, -112.0740, 'America/Phoenix'), c('Salt Lake City', 'USA', 40.7608, -111.8910, 'America/Denver'), c('Los Angeles', 'USA', 34.0522, -118.2437, 'America/Los_Angeles'), c('Artesia', 'USA', 33.8658, -118.0831, 'America/Los_Angeles'),
  c('San Jose', 'USA', 37.3382, -121.8863, 'America/Los_Angeles'), c('Fremont', 'USA', 37.5485, -121.9886, 'America/Los_Angeles'), c('Sunnyvale', 'USA', 37.3688, -122.0363, 'America/Los_Angeles'), c('San Francisco', 'USA', 37.7749, -122.4194, 'America/Los_Angeles'), c('Seattle', 'USA', 47.6062, -122.3321, 'America/Los_Angeles'),
  c('Bellevue', 'USA', 47.6101, -122.2015, 'America/Los_Angeles'), c('Portland', 'USA', 45.5152, -122.6784, 'America/Los_Angeles'), c('San Diego', 'USA', 32.7157, -117.1611, 'America/Los_Angeles'), c('Las Vegas', 'USA', 36.1699, -115.1398, 'America/Los_Angeles'), c('Honolulu', 'USA', 21.3069, -157.8583, 'Pacific/Honolulu'),
  // UK and Ireland
  c('London', 'UK', 51.5074, -0.1278, 'Europe/London'), c('Southall', 'UK', 51.5062, -0.3786, 'Europe/London'), c('Wembley', 'UK', 51.5523, -0.2967, 'Europe/London'), c('Harrow', 'UK', 51.5806, -0.3420, 'Europe/London'), c('Leicester', 'UK', 52.6369, -1.1398, 'Europe/London'),
  c('Birmingham', 'UK', 52.4862, -1.8904, 'Europe/London'), c('Manchester', 'UK', 53.4808, -2.2426, 'Europe/London'), c('Leeds', 'UK', 53.8008, -1.5491, 'Europe/London'), c('Bradford', 'UK', 53.7960, -1.7594, 'Europe/London'), c('Wolverhampton', 'UK', 52.5870, -2.1288, 'Europe/London'),
  c('Coventry', 'UK', 52.4068, -1.5197, 'Europe/London'), c('Glasgow', 'UK', 55.8642, -4.2518, 'Europe/London'), c('Edinburgh', 'UK', 55.9533, -3.1883, 'Europe/London'), c('Cardiff', 'UK', 51.4816, -3.1791, 'Europe/London'), c('Dublin', 'Ireland', 53.3498, -6.2603, 'Europe/Dublin'),
  // Europe
  c('Paris', 'France', 48.8566, 2.3522, 'Europe/Paris'), c('Amsterdam', 'Netherlands', 52.3676, 4.9041, 'Europe/Amsterdam'), c('The Hague', 'Netherlands', 52.0705, 4.3007, 'Europe/Amsterdam'), c('Berlin', 'Germany', 52.5200, 13.4050, 'Europe/Berlin'), c('Frankfurt', 'Germany', 50.1109, 8.6821, 'Europe/Berlin'),
  c('Munich', 'Germany', 48.1351, 11.5820, 'Europe/Berlin'), c('Zurich', 'Switzerland', 47.3769, 8.5417, 'Europe/Zurich'), c('Brussels', 'Belgium', 50.8503, 4.3517, 'Europe/Brussels'), c('Stockholm', 'Sweden', 59.3293, 18.0686, 'Europe/Stockholm'), c('Lisbon', 'Portugal', 38.7223, -9.1393, 'Europe/Lisbon'),
  c('Madrid', 'Spain', 40.4168, -3.7038, 'Europe/Madrid'), c('Rome', 'Italy', 41.9028, 12.4964, 'Europe/Rome'), c('Milan', 'Italy', 45.4642, 9.1900, 'Europe/Rome'), c('Oslo', 'Norway', 59.9139, 10.7522, 'Europe/Oslo'), c('Copenhagen', 'Denmark', 55.6761, 12.5683, 'Europe/Copenhagen'),
  // Gulf and Africa
  c('Dubai', 'UAE', 25.2048, 55.2708, 'Asia/Dubai'), c('Abu Dhabi', 'UAE', 24.4539, 54.3773, 'Asia/Dubai'), c('Sharjah', 'UAE', 25.3463, 55.4209, 'Asia/Dubai'), c('Doha', 'Qatar', 25.2854, 51.5310, 'Asia/Qatar'), c('Muscat', 'Oman', 23.5880, 58.3829, 'Asia/Muscat'),
  c('Manama', 'Bahrain', 26.2285, 50.5860, 'Asia/Bahrain'), c('Kuwait City', 'Kuwait', 29.3759, 47.9774, 'Asia/Kuwait'), c('Riyadh', 'Saudi Arabia', 24.7136, 46.6753, 'Asia/Riyadh'), c('Jeddah', 'Saudi Arabia', 21.4858, 39.1925, 'Asia/Riyadh'), c('Dammam', 'Saudi Arabia', 26.4207, 50.0888, 'Asia/Riyadh'),
  c('Nairobi', 'Kenya', -1.2921, 36.8219, 'Africa/Nairobi'), c('Mombasa', 'Kenya', -4.0435, 39.6682, 'Africa/Nairobi'), c('Kampala', 'Uganda', 0.3476, 32.5825, 'Africa/Kampala'), c('Dar es Salaam', 'Tanzania', -6.7924, 39.2083, 'Africa/Dar_es_Salaam'), c('Durban', 'South Africa', -29.8587, 31.0218, 'Africa/Johannesburg'),
  c('Johannesburg', 'South Africa', -26.2041, 28.0473, 'Africa/Johannesburg'), c('Cape Town', 'South Africa', -33.9249, 18.4241, 'Africa/Johannesburg'), c('Port Louis', 'Mauritius', -20.1609, 57.5012, 'Indian/Mauritius'), c('Lagos', 'Nigeria', 6.5244, 3.3792, 'Africa/Lagos'), c('Cairo', 'Egypt', 30.0444, 31.2357, 'Africa/Cairo'),
  // Asia-Pacific
  c('Singapore', 'Singapore', 1.3521, 103.8198, 'Asia/Singapore'), c('Kuala Lumpur', 'Malaysia', 3.1390, 101.6869, 'Asia/Kuala_Lumpur'), c('Penang', 'Malaysia', 5.4141, 100.3288, 'Asia/Kuala_Lumpur'), c('Johor Bahru', 'Malaysia', 1.4927, 103.7414, 'Asia/Kuala_Lumpur'), c('Hong Kong', 'Hong Kong', 22.3193, 114.1694, 'Asia/Hong_Kong'),
  c('Bangkok', 'Thailand', 13.7563, 100.5018, 'Asia/Bangkok'), c('Jakarta', 'Indonesia', -6.2088, 106.8456, 'Asia/Jakarta'), c('Denpasar', 'Indonesia', -8.6705, 115.2126, 'Asia/Makassar'), c('Tokyo', 'Japan', 35.6762, 139.6503, 'Asia/Tokyo'), c('Seoul', 'South Korea', 37.5665, 126.9780, 'Asia/Seoul'),
  c('Manila', 'Philippines', 14.5995, 120.9842, 'Asia/Manila'), c('Sydney', 'Australia', -33.8688, 151.2093, 'Australia/Sydney'), c('Parramatta', 'Australia', -33.8151, 151.0011, 'Australia/Sydney'), c('Melbourne', 'Australia', -37.8136, 144.9631, 'Australia/Melbourne'), c('Brisbane', 'Australia', -27.4698, 153.0251, 'Australia/Brisbane'),
  c('Perth', 'Australia', -31.9505, 115.8605, 'Australia/Perth'), c('Adelaide', 'Australia', -34.9285, 138.6007, 'Australia/Adelaide'), c('Canberra', 'Australia', -35.2809, 149.1300, 'Australia/Sydney'), c('Auckland', 'New Zealand', -36.8485, 174.7633, 'Pacific/Auckland'), c('Wellington', 'New Zealand', -41.2865, 174.7762, 'Pacific/Auckland'),
  c('Suva', 'Fiji', -18.1416, 178.4419, 'Pacific/Fiji'), c('Nadi', 'Fiji', -17.7765, 177.4356, 'Pacific/Fiji'),
  // Caribbean and South America
  c('Port of Spain', 'Trinidad and Tobago', 10.6918, -61.2225, 'America/Port_of_Spain'), c('Chaguanas', 'Trinidad and Tobago', 10.5167, -61.4167, 'America/Port_of_Spain'), c('Georgetown', 'Guyana', 6.8013, -58.1551, 'America/Guyana'), c('Paramaribo', 'Suriname', 5.8520, -55.2038, 'America/Paramaribo'), c('Kingston', 'Jamaica', 17.9712, -76.7936, 'America/Jamaica'),
  c('Mexico City', 'Mexico', 19.4326, -99.1332, 'America/Mexico_City'), c('Sao Paulo', 'Brazil', -23.5505, -46.6333, 'America/Sao_Paulo'), c('Buenos Aires', 'Argentina', -34.6037, -58.3816, 'America/Argentina/Buenos_Aires'),
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function searchCities(q: string, limit = 12): City[] {
  const n = norm(q.trim());
  if (!n) return CITIES.slice(0, limit);
  const starts: City[] = [], contains: City[] = [];
  for (const city of CITIES) {
    const hay = [city.name, city.region, ...(city.alt ?? [])].map(norm);
    if (hay.some(h => h.startsWith(n))) starts.push(city);
    else if (hay.some(h => h.includes(n)) || (city.alt ?? []).some(a => a.includes(q.trim()))) contains.push(city);
  }
  return [...starts, ...contains].slice(0, limit);
}
export function nearestCity(lat: number, lon: number): City {
  let best = CITIES[0], bd = Infinity;
  for (const city of CITIES) { const d = (city.lat - lat) ** 2 + ((city.lon - lon) * Math.cos(lat * Math.PI / 180)) ** 2; if (d < bd) { bd = d; best = city; } }
  return best;
}
