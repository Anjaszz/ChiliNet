import os
from dotenv import load_dotenv
import base64
from flask import Flask, render_template, request, jsonify, redirect, url_for
from roboflow import Roboflow
import cv2
import numpy as np
import json
from datetime import datetime
from flask_socketio import SocketIO, emit
import midtransclient
import logging

# Load environment variables
load_dotenv()

# Midtrans Configuration
MIDTRANS_SERVER_KEY = os.getenv('MIDTRANS_SERVER_KEY')
MIDTRANS_CLIENT_KEY = os.getenv('MIDTRANS_CLIENT_KEY')
MIDTRANS_IS_PRODUCTION = os.getenv('MIDTRANS_IS_PRODUCTION', 'False').lower() == 'true'

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info(f"- IS_PRODUCTION: {MIDTRANS_IS_PRODUCTION}")
logger.info(f"- SERVER_KEY: {MIDTRANS_SERVER_KEY[:20]}..." if MIDTRANS_SERVER_KEY else "None")
logger.info(f"- CLIENT_KEY: {MIDTRANS_CLIENT_KEY[:20]}..." if MIDTRANS_CLIENT_KEY else "None")

# Inisialisasi Flask dan SocketIO
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456')
socketio = SocketIO(app, cors_allowed_origins="*")

# Inisialisasi Midtrans
snap = midtransclient.Snap(
    is_production=MIDTRANS_IS_PRODUCTION,
    server_key=MIDTRANS_SERVER_KEY,
     client_key=MIDTRANS_CLIENT_KEY 
)

# File untuk menyimpan data donasi (dalam produksi gunakan database)
DONATIONS_FILE = 'donations.json'

ROBOFLOW_API_KEY = os.getenv('ROBOFLOW_API_KEY')

# Inisialisasi Roboflow
rf = Roboflow(api_key=ROBOFLOW_API_KEY)
project = rf.workspace("data-cabai").project("penyakit-cabai-klsjq")
model = project.version(14).model

# Direktori upload
UPLOAD_FOLDER = 'static/uploads/'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Pastikan direktori upload ada
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Database informasi penyakit dengan saran penanganan
DISEASE_INFO = {
    'leaf_spot': {
        'name': 'Leaf Spot',
        'icon': '🔴',
        'description': 'Penyakit jamur dengan bercak coklat/hitam yang mengurangi fotosintesis dan hasil panen.',
        'symptoms': [
            'Bercak coklat atau hitam pada daun',
            'Bercak dapat membesar dan menyatu',
            'Daun menguning dan gugur prematur',
            'Produktivitas tanaman menurun'
        ],
        'treatments': [
            'Semprot dengan fungisida berbahan aktif mankozeb atau klorotalonil',
            'Buang dan musnahkan daun yang terinfeksi',
            'Perbaiki drainase untuk mengurangi kelembaban berlebih',
            'Berikan jarak tanam yang cukup untuk sirkulasi udara',
            'Aplikasi fungisida setiap 7-10 hari saat cuaca lembab'
        ],
        'prevention': [
            'Rotasi tanaman dengan keluarga non-solanaceae',
            'Hindari penyiraman dari atas daun',
            'Jaga kebersihan lahan dari gulma',
            'Gunakan mulsa untuk mencegah percikan air tanah ke daun'
        ]
    },
    'leaf_curl': {
        'name': 'Leaf Curl',
        'icon': '🌀',
        'description': 'Penyakit virus yang menyebabkan daun keriting, sering ditularkan oleh kutu daun.',
        'symptoms': [
            'Daun mengkerut dan melengkung ke atas',
            'Pertumbuhan tanaman terhambat',
            'Daun muda berwarna kekuningan',
            'Produksi buah berkurang drastis'
        ],
        'treatments': [
            'Semprot insektisida untuk mengendalikan kutu daun vektor',
            'Gunakan minyak neem sebagai insektisida alami',
            'Pasang perangkap kuning untuk menangkap kutu daun',
            'Buang tanaman yang terinfeksi berat',
            'Berikan pupuk kalium untuk meningkatkan daya tahan'
        ],
        'prevention': [
            'Gunakan benih atau bibit yang bebas virus',
            'Kendalikan populasi kutu daun secara rutin',
            'Pasang mulsa reflektif untuk mengusir kutu daun',
            'Tanam tanaman perangkap seperti jagung di sekitar lahan'
        ]
    },
    'whitefly': {
        'name': 'Whitefly',
        'icon': '🪰',
        'description': 'Hama yang menyebabkan daun menguning dengan menghisap cairan tanaman dan menularkan virus.',
        'symptoms': [
            'Daun menguning dan layu',
            'Embun madu (honeydew) pada permukaan daun',
            'Pertumbuhan jamur hitam (sooty mold)',
            'Kutu putih kecil terlihat di bagian bawah daun'
        ],
        'treatments': [
            'Semprot dengan insektisida sistemik imidakloprid',
            'Gunakan sabun insektisida (1-2%) untuk semprot halus',
            'Pasang perangkap kuning lengket di sekitar tanaman',
            'Semprot minyak neem setiap 5-7 hari',
            'Gunakan predator alami seperti Encarsia formosa'
        ],
        'prevention': [
            'Periksa tanaman secara rutin setiap 2-3 hari',
            'Jaga kebersihan gulma di sekitar pertanaman',
            'Gunakan mulsa reflektif perak',
            'Tanam tanaman refugia untuk predator alami'
        ]
    },
    'yellowish': {
        'name': 'Yellowish',
        'icon': '💛',
        'description': 'Menguning secara umum yang menunjukkan kekurangan nutrisi atau stres tanaman.',
        'symptoms': [
            'Daun menguning dimulai dari bagian bawah',
            'Pertumbuhan tanaman melambat',
            'Daun tampak pucat dan lemah',
            'Produksi buah menurun'
        ],
        'treatments': [
            'Berikan pupuk NPK seimbang (16:16:16)',
            'Aplikasi pupuk daun dengan kandungan nitrogen tinggi',
            'Perbaiki sistem drainase jika tanah tergenang',
            'Berikan kompos atau pupuk organik',
            'Atur jadwal penyiraman yang konsisten'
        ],
        'prevention': [
            'Lakukan uji tanah untuk mengetahui status hara',
            'Berikan pupuk dasar yang cukup sebelum tanam',
            'Jaga kelembaban tanah yang optimal',
            'Gunakan mulsa organik untuk menjaga kelembaban'
        ]
    }
}

def get_disease_key(class_name):
    """Convert class name to disease key dengan lebih banyak variasi"""
    # Normalisasi nama class
    normalized_name = class_name.lower().strip().replace(' ', '_').replace('-', '_')
    
    logger.info(f"Original class name: '{class_name}'")
    logger.info(f"Normalized class name: '{normalized_name}'")
    
    # Mapping yang lebih comprehensive
    disease_mapping = {
        # Leaf Spot variations
        'leaf_spot': 'leaf_spot',
        'leafspot': 'leaf_spot',
        'leaf spot': 'leaf_spot', 
        'spot': 'leaf_spot',
        'bercak_daun': 'leaf_spot',
        'bercak': 'leaf_spot',
        
        # Leaf Curl variations  
        'leaf_curl': 'leaf_curl',
        'leafcurl': 'leaf_curl',
        'leaf curl': 'leaf_curl',
        'curl': 'leaf_curl',
        'keriting': 'leaf_curl',
        'daun_keriting': 'leaf_curl',
        
        # Whitefly variations
        'whitefly': 'whitefly',
        'white_fly': 'whitefly',
        'white fly': 'whitefly',
        'kutu_putih': 'whitefly',
        'kutu': 'whitefly',
        
        # Yellowish variations
        'yellowish': 'yellowish',
        'yellow': 'yellowish',
        'kuning': 'yellowish',
        'menguning': 'yellowish',
        'daun_kuning': 'yellowish'
    }
    
    # Coba mapping langsung
    if normalized_name in disease_mapping:
        mapped_key = disease_mapping[normalized_name]
        logger.info(f"Found direct mapping: '{normalized_name}' -> '{mapped_key}'")
        return mapped_key
    
    # Coba partial matching
    for key, value in disease_mapping.items():
        if key in normalized_name or normalized_name in key:
            logger.info(f"Found partial mapping: '{normalized_name}' contains '{key}' -> '{value}'")
            return value
    
    logger.warning(f"No mapping found for class name: '{class_name}' (normalized: '{normalized_name}')")
    return None

def extract_detected_diseases(predictions):
    """Extract unique diseases from predictions dengan distribusi persentase"""
    logger.info("=== STARTING DISEASE EXTRACTION WITH DISTRIBUTION ===")
    logger.info(f"Raw predictions: {predictions}")
    
    # Dictionary untuk menyimpan semua deteksi per penyakit
    disease_detections = {}
    total_confidence = 0
    
    predictions_list = predictions.get('predictions', [])
    logger.info(f"Number of predictions: {len(predictions_list)}")
    
    # Kumpulkan semua deteksi dan confidence
    for i, prediction in enumerate(predictions_list):
        logger.info(f"--- Processing prediction {i+1} ---")
        
        class_name = prediction.get('class', 'unknown')
        confidence = prediction.get('confidence', 0)
        
        logger.info(f"Class name: '{class_name}', Confidence: {confidence}")
        
        disease_key = get_disease_key(class_name)
        
        if disease_key:
            if disease_key not in disease_detections:
                disease_detections[disease_key] = []
            
            disease_detections[disease_key].append({
                'confidence': confidence,
                'original_class': class_name,
                'bbox': {
                    'x': prediction.get('x', 0),
                    'y': prediction.get('y', 0),
                    'width': prediction.get('width', 0),
                    'height': prediction.get('height', 0)
                }
            })
            total_confidence += confidence
            logger.info(f"Added detection: {disease_key} with confidence {confidence}")
    
    # Hitung distribusi dan buat disease_details
    disease_details = []
    
    for disease_key, detections in disease_detections.items():
        # Hitung rata-rata confidence untuk penyakit ini
        avg_confidence = sum(d['confidence'] for d in detections) / len(detections)

        # Hitung max confidence untuk penyakit ini
        max_confidence = max(d['confidence'] for d in detections)
        
        # Hitung total confidence untuk penyakit ini (semua deteksi)
        disease_total_confidence = sum(d['confidence'] for d in detections)
        
        # Hitung persentase distribusi
        if total_confidence > 0:
            distribution_percentage = (disease_total_confidence / total_confidence) * 100
        else:
            distribution_percentage = 0
        
        # Buat info penyakit
        disease_info = DISEASE_INFO[disease_key].copy()
        disease_info.update({
            'confidence': avg_confidence,      # Tetap average untuk internal
            'max_confidence': max_confidence,  # Tambah max confidence
            'avg_confidence': avg_confidence,  # Explicit average
            'distribution_percentage': distribution_percentage,
            'detection_count': len(detections),
            'total_confidence': disease_total_confidence,
            'original_classes': list(set(d['original_class'] for d in detections)),
            'all_detections': detections
        })
        
        disease_details.append(disease_info)
        logger.info(f"Disease {disease_key}: {len(detections)} detections, "
                   f"avg confidence: {avg_confidence:.3f}, "
                   f"distribution: {distribution_percentage:.1f}%")
    
    # Sort berdasarkan distribution percentage (tertinggi dulu)
    disease_details.sort(key=lambda x: x['distribution_percentage'], reverse=True)
    
    logger.info(f"=== EXTRACTION COMPLETE ===")
    logger.info(f"Total unique diseases: {len(disease_details)}")
  
    
    return disease_details

# Route untuk landing page
@app.route('/')
def landing():
    return render_template('landing.html')

# Route untuk halaman upload
@app.route('/upload')
def index():
    return render_template('index.html')

# Route untuk streaming webcam
@app.route('/stream_webcam')
def stream_webcam():
    return render_template('webcam.html')

@app.route('/reset')
def reset_upload():
    return redirect(url_for('index'))

# Route untuk menangani upload gambar atau video
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return redirect(request.url)
    
    file = request.files['file']
    input_type = request.form.get('input_type')

    if file.filename == '':
        return redirect(request.url)

    if file:
        # Simpan file yang diupload
        filename = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filename)

        # Proses file (gambar atau video)
        if input_type == "image":
            return process_image(filename)
        elif input_type == "video":
            return process_video(filename)
    
    return redirect(url_for('index'))

# Fungsi untuk memproses gambar
def process_image(image_path):
    logger.info(f"Processing image: {image_path}")
    
    frame = cv2.imread(image_path)
    if frame is None:
        return "Gambar tidak ditemukan."
    
    # Prediksi dengan logging  
    logger.info("Making prediction...")
    predictions = model.predict(frame, confidence=12, overlap=40).json()
    logger.info(f"Raw prediction response: {predictions}")
    
    # Extract detected diseases
    detected_diseases = extract_detected_diseases(predictions)
    logger.info(f"Final detected diseases: {len(detected_diseases)} diseases")

    # Gambar bounding boxes
    for prediction in predictions.get('predictions', []):
        x, y, w, h = int(prediction['x']), int(prediction['y']), int(prediction['width']), int(prediction['height'])
        confidence = prediction['confidence']
        class_name = prediction['class']
        cv2.rectangle(frame, (x, y), (x + w, y + h), (56, 33, 229), 2)
        text = f"{class_name}: {confidence:.2f}"
        cv2.putText(frame, text, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255) , 2)
    
    # Simpan hasil prediksi
    result_image = os.path.join(app.config['UPLOAD_FOLDER'], 'result_image.jpg')
    cv2.imwrite(result_image, frame)

    return render_template('index.html', 
                         result_image=result_image, 
                         detected_diseases=detected_diseases,
                         has_detections=len(detected_diseases) > 0)

# Fungsi untuk memproses video
def process_video(video_path):
    logger.info(f"Processing video: {video_path}")
    
    cap = cv2.VideoCapture(video_path)
    frames = []
    all_predictions = []
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        predictions = model.predict(frame, confidence=12, overlap=40).json()
        all_predictions.extend(predictions.get('predictions', []))

        for prediction in predictions.get('predictions', []):
            x, y, w, h = int(prediction['x']), int(prediction['y']), int(prediction['width']), int(prediction['height'])
            confidence = prediction['confidence']
            class_name = prediction['class']
            cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 0, 0), 2)
            text = f"{class_name}: {confidence:.2f}"
            cv2.putText(frame, text, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
        
        frames.append(frame)

    cap.release()

    if not frames:
        return "Video tidak dapat diproses."

    # Extract detected diseases from all predictions
    video_predictions = {'predictions': all_predictions}
    detected_diseases = extract_detected_diseases(video_predictions)

    # Simpan video hasil prediksi
    result_video = os.path.join(app.config['UPLOAD_FOLDER'], 'result_video.mp4')
    height, width, _ = frames[0].shape
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(result_video, fourcc, 20.0, (width, height))
    
    for frame in frames:
        out.write(frame)
    out.release()

    return render_template('index.html', 
                         result_video=result_video,
                         detected_diseases=detected_diseases,
                         has_detections=len(detected_diseases) > 0)

# Fungsi untuk menangkap gambar dari webcam
@app.route('/capture_webcam', methods=['POST'])
def capture_webcam():
    try:
        logger.info("=== WEBCAM CAPTURE REQUEST ===")
        
        # Mendapatkan gambar dari stream webcam yang dikirim oleh frontend
        image_data = request.form.get('image')
        if image_data:
            # Decode gambar yang dikirim dalam format base64
            image_data = image_data.split(',')[1]  # Menghapus prefix data URL
            image_bytes = base64.b64decode(image_data)
            np_img = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

            # Proses gambar menggunakan model
            logger.info("Making webcam prediction...")
            predictions = model.predict(frame, confidence=12, overlap=40).json()
            logger.info(f"Webcam prediction response: {predictions}")
            
            # Extract detected diseases
            detected_diseases = extract_detected_diseases(predictions)

            # Gambar hasil prediksi
            for prediction in predictions.get('predictions', []):
                x, y, w, h = int(prediction['x']), int(prediction['y']), int(prediction['width']), int(prediction['height'])
                confidence = prediction['confidence']
                class_name = prediction['class']
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 255), 2)
                text = f"{class_name}: {confidence:.2f}"
                cv2.putText(frame, text, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)

            # Simpan hasil prediksi
            result_image = os.path.join(app.config['UPLOAD_FOLDER'], 'result_image_from_webcam.jpg')
            cv2.imwrite(result_image, frame)

            # Kirimkan hasil gambar dan informasi penyakit kembali ke frontend
            response_data = {
                'result_image': result_image,
                'detected_diseases': detected_diseases,
                'has_detections': len(detected_diseases) > 0
            }
            
            logger.info(f"Sending response: {response_data}")
            return jsonify(response_data)

        return jsonify({'error': 'No image received'})
    
    except Exception as e:
        logger.error(f"Webcam capture error: {str(e)}")
        return jsonify({'error': str(e)})


def load_donations():
    """Load donations from JSON file"""
    try:
        if os.path.exists(DONATIONS_FILE):
            with open(DONATIONS_FILE, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        logger.error(f"Error loading donations: {e}")
        return []

def save_donations(donations):
    """Save donations to JSON file"""
    try:
        with open(DONATIONS_FILE, 'w') as f:
            json.dump(donations, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving donations: {e}")

def get_leaderboard():
    """Get donation leaderboard"""
    donations = load_donations()
    # Group by donor name and sum amounts
    leaderboard = {}
    
    for donation in donations:
        if donation['status'] == 'success':
            name = donation['donor_name']
            amount = donation['amount']
            
            if name in leaderboard:
                leaderboard[name]['total_amount'] += amount
                leaderboard[name]['donation_count'] += 1
            else:
                leaderboard[name] = {
                    'name': name,
                    'total_amount': amount,
                    'donation_count': 1,
                    'last_donation': donation['created_at']
                }
    
    # Convert to list and sort by total amount
    leaderboard_list = list(leaderboard.values())
    leaderboard_list.sort(key=lambda x: x['total_amount'], reverse=True)
    
    return leaderboard_list

# Route untuk donasi
# Route untuk donasi - FINAL VERSION
@app.route('/donate', methods=['POST'])
def create_donation():
    try:
        logger.info("=== DONATION REQUEST RECEIVED ===")
        
        # Check Midtrans config
        if not MIDTRANS_SERVER_KEY:
            logger.error("MIDTRANS_SERVER_KEY not configured")
            return jsonify({
                'success': False,
                'message': 'Midtrans configuration error'
            }), 500
        
        data = request.get_json()
        logger.info(f"Request data: {data}")
        
        donor_name = data.get('donor_name', '').strip()
        amount = int(data.get('amount', 0))
        message = data.get('message', '').strip()
        
        if not donor_name or amount < 5000:
            return jsonify({
                'success': False,
                'message': 'Nama donor dan minimal donasi Rp 5.000 wajib diisi'
            }), 400
        
        # Generate unique order ID menggunakan datetime
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        order_id = f"DONATION-{timestamp}"
        logger.info(f"Generated order_id: {order_id}")
        
        # Midtrans transaction details
        transaction_details = {
            "order_id": order_id,
            "gross_amount": amount
        }
        
        item_details = [{
            "id": "donation-001",
            "price": amount,
            "quantity": 1,
            "name": "Donasi ChiliNet Development",
            "category": "donation"
        }]
        
        customer_details = {
            "first_name": donor_name,
            "last_name": "",
            "email": f"donor-{timestamp}@chilinet.com",
            "phone": "+62000000000"
        }
        
        transaction_data = {
            "transaction_details": transaction_details,
            "item_details": item_details,
            "customer_details": customer_details,
            "credit_card": {
                "secure": True
            },
            "callbacks": {
                "finish": f"{request.host_url}donation/finish?order_id={order_id}"
            }
        }
        
        logger.info(f"Transaction data: {transaction_data}")
        
        # Create Snap transaction
        try:
            transaction = snap.create_transaction(transaction_data)
            logger.info(f"✅ Midtrans transaction created: {transaction}")
        except Exception as midtrans_error:
            logger.error(f"❌ Midtrans error: {midtrans_error}")
            return jsonify({
                'success': False,
                'message': f'Midtrans error: {str(midtrans_error)}'
            }), 500
        
        # Save donation record
        donations = load_donations()
        donation_record = {
            "order_id": order_id,
            "donor_name": donor_name,
            "amount": amount,
            "message": message,
            "status": "pending",
            "snap_token": transaction['token'],
            "created_at": datetime.now().isoformat()
        }
        
        donations.append(donation_record)
        save_donations(donations)
        
        logger.info(f"✅ Donation saved: {order_id} - {donor_name} - Rp {amount:,}")
        
        return jsonify({
            'success': True,
            'snap_token': transaction['token'],
            'order_id': order_id
        })
        
    except Exception as e:
        logger.error(f"❌ Error creating donation: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'Terjadi kesalahan sistem: {str(e)}'
        }), 500

# Webhook untuk menerima notifikasi dari Midtrans
@app.route('/midtrans/notification', methods=['POST'])
def midtrans_notification():
    try:
        notification = request.get_json()
        order_id = notification.get('order_id')
        transaction_status = notification.get('transaction_status')
        fraud_status = notification.get('fraud_status', 'accept')
        
        logger.info(f"🔔 Midtrans notification: {order_id} - {transaction_status}")
        
        # Load donations
        donations = load_donations()
        
        # Find donation record
        donation_index = None
        for i, donation in enumerate(donations):
            if donation['order_id'] == order_id:
                donation_index = i
                break
        
        if donation_index is None:
            logger.warning(f"❌ Donation not found: {order_id}")
            return jsonify({'status': 'not_found'}), 404
        
        # Update donation status
        old_status = donations[donation_index]['status']
        
        if transaction_status == 'capture' or transaction_status == 'settlement':
            if fraud_status == 'accept':
                donations[donation_index]['status'] = 'success'
                donations[donation_index]['paid_at'] = datetime.now().isoformat()
                logger.info(f"✅ Donation marked as successful: {order_id}")
        elif transaction_status == 'pending':
            donations[donation_index]['status'] = 'pending'
            logger.info(f"⏳ Donation pending: {order_id}")
        elif transaction_status in ['deny', 'cancel', 'expire']:
            donations[donation_index]['status'] = 'failed'
            logger.info(f"❌ Donation failed: {order_id}")
        
        save_donations(donations)
        
        # Emit real-time notifications jika status berubah ke success
        if old_status != 'success' and donations[donation_index]['status'] == 'success':
            donation_data = donations[donation_index]
            
            # Emit donation notification
            socketio.emit('new_donation', {
                'donor_name': donation_data['donor_name'],
                'amount': donation_data['amount'],
                'message': donation_data.get('message', ''),
                'timestamp': donation_data['paid_at']
            })
            
            # Emit leaderboard update
            updated_leaderboard = get_leaderboard()
            socketio.emit('leaderboard_updated', {
                'leaderboard': updated_leaderboard
            })
            
            # Emit recent donations update
            successful_donations = [
                d for d in donations if d['status'] == 'success'
            ]
            successful_donations.sort(
                key=lambda x: x.get('paid_at', x['created_at']), 
                reverse=True
            )
            
            socketio.emit('recent_donations_updated', {
                'donations': successful_donations[:10]
            })
            
            logger.info(f"🎉 Emitted real-time updates for donation: {donation_data['donor_name']} - Rp {donation_data['amount']:,}")
        
        return jsonify({'status': 'ok'})
        
    except Exception as e:
        logger.error(f"❌ Error processing Midtrans notification: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'status': 'error'}), 500


# Route untuk halaman finish donasi
@app.route('/donation/finish')
def donation_finish():
    order_id = request.args.get('order_id')
    
    # Load donation data
    donations = load_donations()
    donation = None
    
    for d in donations:
        if d['order_id'] == order_id:
            donation = d
            break
    
    return render_template('donation_finish.html', donation=donation)

# API untuk mendapatkan leaderboard
@app.route('/api/leaderboard')
def api_leaderboard():
    return jsonify({
        'success': True,
        'leaderboard': get_leaderboard()
    })

# API untuk mendapatkan donasi terbaru
@app.route('/api/recent-donations')
def api_recent_donations():
    donations = load_donations()
    
    # Filter hanya donasi yang berhasil dan ambil 10 terbaru
    successful_donations = [
        d for d in donations 
        if d['status'] == 'success'
    ]
    
    # Sort by paid_at timestamp
    successful_donations.sort(
        key=lambda x: x.get('paid_at', x['created_at']), 
        reverse=True
    )
    
    return jsonify({
        'success': True,
        'donations': successful_donations[:10]  # 10 donasi terbaru
    })
    
@app.route('/test-midtrans')
def test_midtrans():
    try:
        # Generate timestamp tanpa module time
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        
        transaction_data = {
            "transaction_details": {
                "order_id": f"TEST-{timestamp}",
                "gross_amount": 10000
            },
            "item_details": [{
                "id": "test",
                "price": 10000,
                "quantity": 1,
                "name": "Test Item"
            }],
            "customer_details": {
                "first_name": "Test",
                "last_name": "User",
                "email": "test@chilinet.com"
            }
        }
        
        transaction = snap.create_transaction(transaction_data)
        return jsonify({
            'success': True,
            'message': 'Midtrans connection OK! 🎉',
            'token': transaction['token'],
            'order_id': f"TEST-{timestamp}"
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Midtrans connection failed ❌'
        })    

# WebSocket events
@socketio.on('connect')
def handle_connect():
    logger.info('Client connected')
    emit('connected', {'data': 'Connected to donation system'})

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('Client disconnected')

if __name__ == '__main__':
   socketio.run(app, debug=True, host='0.0.0.0', port=5000)