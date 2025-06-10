import os
from dotenv import load_dotenv
import base64
from flask import Flask, render_template, request, jsonify, redirect, url_for
from roboflow import Roboflow
import cv2
import numpy as np
import logging
import tempfile

# Load environment variables
load_dotenv()

ROBOFLOW_API_KEY = os.getenv('ROBOFLOW_API_KEY')

# Setup logging untuk debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inisialisasi Flask
app = Flask(__name__)

# Inisialisasi Roboflow
rf = Roboflow(api_key=ROBOFLOW_API_KEY)
project = rf.workspace("data-cabai").project("penyakit-cabai-klsjq")
model = project.version(14).model

# Direktori upload (hanya untuk hasil prediksi)
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

def draw_predictions(frame, predictions):
    """Draw bounding boxes and labels on frame"""
    for prediction in predictions.get('predictions', []):
        # Roboflow format: x,y adalah center point
        center_x = int(prediction['x'])
        center_y = int(prediction['y'])
        width = int(prediction['width'])
        height = int(prediction['height'])
        
        # Convert ke top-left corner coordinates
        x1 = center_x - width // 2
        y1 = center_y - height // 2
        x2 = center_x + width // 2
        y2 = center_y + height // 2
        
        # Pastikan koordinat tidak negatif dan dalam batas gambar
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(frame.shape[1], x2)  # frame.shape[1] = width
        y2 = min(frame.shape[0], y2)  # frame.shape[0] = height
        
        confidence = prediction['confidence']
        class_name = prediction['class']
        
        # Gambar rectangle dengan koordinat yang benar
        cv2.rectangle(frame, (x1, y1), (x2, y2), (56, 33, 229), 2)
        text = f"{class_name}: {confidence:.2f}"
        cv2.putText(frame, text, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)
    
    return frame

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

# Route untuk menangani upload gambar atau video (TANPA MENYIMPAN FILE ASLI)
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return redirect(request.url)
    
    file = request.files['file']
    input_type = request.form.get('input_type')

    if file.filename == '':
        return redirect(request.url)

    if file:
        # Proses file langsung dari memory tanpa menyimpan file asli
        if input_type == "image":
            return process_image_from_memory(file)
        elif input_type == "video":
            return process_video_from_memory(file)
    
    return redirect(url_for('index'))

# Fungsi untuk memproses gambar langsung dari memory
def process_image_from_memory(file_object):
    logger.info(f"Processing image from memory: {file_object.filename}")
    
    try:
        # Baca file langsung dari memory tanpa menyimpan
        file_bytes = file_object.read()
        
        # Convert bytes ke numpy array
        np_img = np.frombuffer(file_bytes, np.uint8)
        
        # Decode gambar menggunakan OpenCV
        frame = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        
        if frame is None:
            logger.error("Failed to decode image")
            return render_template('index.html', 
                                 error_message="Gambar tidak dapat dibaca atau format tidak didukung.",
                                 detected_diseases=[],
                                 has_detections=False)
        
        # Prediksi dengan logging  
        logger.info("Making prediction...")
        predictions = model.predict(frame, confidence=12, overlap=40).json()
        logger.info(f"Raw prediction response: {predictions}")
        
        # Extract detected diseases
        detected_diseases = extract_detected_diseases(predictions)
        logger.info(f"Final detected diseases: {len(detected_diseases)} diseases")

        # Gambar bounding boxes
        frame_with_predictions = draw_predictions(frame, predictions)
        
        # Simpan HANYA hasil prediksi (bukan file asli)
        result_image = os.path.join(app.config['UPLOAD_FOLDER'], 'result_image.jpg')
        cv2.imwrite(result_image, frame_with_predictions)

        return render_template('index.html', 
                             result_image=result_image, 
                             detected_diseases=detected_diseases,
                             has_detections=len(detected_diseases) > 0)
    
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return render_template('index.html', 
                             error_message=f"Error memproses gambar: {str(e)}",
                             detected_diseases=[],
                             has_detections=False)

# Fungsi untuk memproses video langsung dari memory
def process_video_from_memory(file_object):
    logger.info(f"Processing video from memory: {file_object.filename}")
    
    # Untuk video, kita gunakan temporary file karena cv2.VideoCapture
    # tidak bisa langsung membaca dari memory untuk semua format
    temp_video = None
    
    try:
        # Buat temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
            temp_video_path = temp_video.name
            # Tulis konten file ke temporary file
            file_object.seek(0)  # Reset file pointer
            temp_video.write(file_object.read())
        
        logger.info(f"Created temporary video file: {temp_video_path}")
        
        cap = cv2.VideoCapture(temp_video_path)
        frames = []
        all_predictions = []
        
        if not cap.isOpened():
            raise Exception("Cannot open video file")
        
        frame_count = 0
        while True:
            ret, frame = cap.read()  
            if not ret:
                break
            
            frame_count += 1
            logger.info(f"Processing frame {frame_count}")
            
            predictions = model.predict(frame, confidence=12, overlap=40).json()
            all_predictions.extend(predictions.get('predictions', []))

            # Gambar bounding boxes
            frame_with_predictions = draw_predictions(frame, predictions)
            frames.append(frame_with_predictions)

        cap.release()
        
        # Hapus temporary file
        os.unlink(temp_video_path)
        logger.info(f"Deleted temporary video file: {temp_video_path}")

        if not frames:
            return render_template('index.html', 
                                 error_message="Video tidak dapat diproses atau tidak ada frame yang valid.",
                                 detected_diseases=[],
                                 has_detections=False)

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

        logger.info(f"Video processing complete. Processed {len(frames)} frames")
        
        return render_template('index.html', 
                             result_video=result_video,
                             detected_diseases=detected_diseases,
                             has_detections=len(detected_diseases) > 0)
    
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        
        # Pastikan temporary file terhapus jika ada error
        if temp_video and os.path.exists(temp_video_path):
            try:
                os.unlink(temp_video_path)
                logger.info(f"Cleaned up temporary file: {temp_video_path}")
            except:
                pass
        
        return render_template('index.html', 
                             error_message=f"Error memproses video: {str(e)}",
                             detected_diseases=[],
                             has_detections=False)

# Fungsi untuk menangkap gambar dari webcam
@app.route('/capture_webcam', methods=['POST'])
def capture_webcam():
    try:
        logger.info("=== WEBCAM CAPTURE REQUEST ===")
        
        # Mendapatkan gambar dari stream webcam yang dikirim oleh frontend
        image_data = request.form.get('image')
        if not image_data:
            return jsonify({'error': 'No image data received'})
        
        # Decode gambar yang dikirim dalam format base64
        if ',' in image_data:
            image_data = image_data.split(',')[1]  # Menghapus prefix data URL
        
        image_bytes = base64.b64decode(image_data)
        np_img = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Failed to decode webcam image'})

        # Proses gambar menggunakan model
        logger.info("Making webcam prediction...")
        predictions = model.predict(frame, confidence=12, overlap=40).json()
        logger.info(f"Webcam prediction response: {predictions}")
        
        # Extract detected diseases
        detected_diseases = extract_detected_diseases(predictions)

        # Gambar hasil prediksi
        frame_with_predictions = draw_predictions(frame, predictions)

        # Simpan hasil prediksi
        result_image = os.path.join(app.config['UPLOAD_FOLDER'], 'result_image_from_webcam.jpg')
        cv2.imwrite(result_image, frame_with_predictions)

        # Kirimkan hasil gambar dan informasi penyakit kembali ke frontend
        response_data = {
            'result_image': result_image,
            'detected_diseases': detected_diseases,
            'has_detections': len(detected_diseases) > 0
        }
        
        logger.info(f"Sending webcam response: has_detections={len(detected_diseases) > 0}")
        return jsonify(response_data)

    except Exception as e:
        logger.error(f"Webcam capture error: {str(e)}")
        return jsonify({'error': f'Webcam processing error: {str(e)}'})

# Alternative endpoint untuk processing tanpa menyimpan hasil sama sekali
@app.route('/process_no_save', methods=['POST'])
def process_no_save():
    """Endpoint untuk memproses gambar tanpa menyimpan hasil ke disk"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'})
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'})
        
        # Baca file dari memory
        file_bytes = file.read()
        np_img = np.frombuffer(file_bytes, np.uint8)
        frame = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'error': 'Invalid image format'})
        
        # Prediksi
        predictions = model.predict(frame, confidence=12, overlap=40).json()
        detected_diseases = extract_detected_diseases(predictions)
        
        # Gambar bounding boxes
        frame_with_predictions = draw_predictions(frame, predictions)
        
        # Convert hasil ke base64 untuk dikirim ke frontend
        _, buffer = cv2.imencode('.jpg', frame_with_predictions)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'result_image': f"data:image/jpeg;base64,{img_base64}",
            'detected_diseases': detected_diseases,
            'has_detections': len(detected_diseases) > 0
        })
    
    except Exception as e:
        logger.error(f"Process no save error: {str(e)}")
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)