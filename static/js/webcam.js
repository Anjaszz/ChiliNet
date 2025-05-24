tailwind.config = {
    theme: {
        extend: {
            colors: {
                'neon-green': '#39ff14',
                'neon-pink': '#ff10f0',
                'neon-blue': '#00ffff',
                'neon-yellow': '#ffff00',
            },
            fontFamily: {
                'mono': ['JetBrains Mono', 'monospace'],
            }
        }
    }
}

  // Fungsi untuk mulai mengambil video dari webcam
  function startWebcam() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function(stream) {
                var videoElement = document.getElementById('webcam');
                videoElement.srcObject = stream;
                videoElement.play();
                // Show success message
                document.getElementById('status').innerHTML = '✅ Webcam Active - Ready to Capture!';
                document.getElementById('status').className = 'text-neon-green font-bold text-xl text-center mb-4';
            })
            .catch(function(err) {
                console.log("Terjadi kesalahan: " + err);
                document.getElementById('status').innerHTML = '❌ Webcam Access Denied';
                document.getElementById('status').className = 'text-red-500 font-bold text-xl text-center mb-4';
            });
    } else {
        alert("Browser Anda tidak mendukung akses webcam.");
        document.getElementById('status').innerHTML = '❌ Browser Not Supported';
        document.getElementById('status').className = 'text-red-500 font-bold text-xl text-center mb-4';
    }
}

// Fungsi untuk mengambil snapshot dari webcam
function captureImage() {
    var canvas = document.createElement('canvas');
    var video = document.getElementById('webcam');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    var imageData = canvas.toDataURL('image/jpeg');

    // Show processing message
    document.getElementById('processing').style.display = 'block';
    document.getElementById('capture-btn').disabled = true;
    document.getElementById('capture-btn').innerHTML = '⏳ Processing...';

    // Clear previous results
    document.getElementById('result-section').style.display = 'none';
    document.getElementById('disease-info-section').style.display = 'none';

    // Kirim gambar ke backend (Flask)
    var formData = new FormData();
    formData.append('image', imageData);

    // Kirim ke backend dan ambil gambar baru
    fetch('/capture_webcam', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Hide processing message
        document.getElementById('processing').style.display = 'none';
        document.getElementById('capture-btn').disabled = false;
        document.getElementById('capture-btn').innerHTML = '📸 CAPTURE & ANALYZE';

        // Tampilkan hasil prediksi jika ada
        if (data.result_image) {
            document.getElementById('result').src = data.result_image;
            document.getElementById('result').style.display = 'block';
            document.getElementById('result-section').style.display = 'block';
            
            // Show analysis results
            if (data.has_detections && data.detected_diseases) {
                displayDiseaseInfo(data.detected_diseases);
                document.getElementById('result-status').innerHTML = '🎯 Analysis Complete - Disease Detected!';
                document.getElementById('result-status').className = 'text-red-500 font-bold text-xl text-center mb-4';
            } else {
                displayHealthyPlant();
                document.getElementById('result-status').innerHTML = '✅ Analysis Complete - Plant Healthy!';
                document.getElementById('result-status').className = 'text-neon-green font-bold text-xl text-center mb-4';
            }
        } else {
            document.getElementById('result-status').innerHTML = '❌ Analysis Failed';
            document.getElementById('result-status').className = 'text-red-500 font-bold text-xl text-center mb-4';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('processing').style.display = 'none';
        document.getElementById('capture-btn').disabled = false;
        document.getElementById('capture-btn').innerHTML = '📸 CAPTURE & ANALYZE';
        document.getElementById('result-status').innerHTML = '❌ Connection Error';
        document.getElementById('result-status').className = 'text-red-500 font-bold text-xl text-center mb-4';
    });
}

function displayDiseaseInfo(diseases) {
    const diseaseSection = document.getElementById('disease-info-section');
    const diseaseContainer = document.getElementById('disease-info-container');
    
    // Clear previous content
    diseaseContainer.innerHTML = '';
    
    // Add distribution summary if multiple diseases
    if (diseases.length > 1) {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'bg-black border-4 border-neon-yellow neobrutalism-shadow p-6 mb-6';
        
        let summaryHTML = `
            <h4 class="text-2xl font-bold text-neon-yellow mb-4 text-center">📊 Distribusi Penyakit Terdeteksi</h4>
            <div class="space-y-3">
        `;
        
        diseases.forEach(disease => {
            summaryHTML += `
                <div class="flex items-center justify-between bg-white border-2 border-black p-3">
                    <div class="flex items-center">
                        <span class="text-2xl mr-3">${disease.icon}</span>
                        <div>
                            <span class="font-bold text-black">${disease.name}</span>
                            <div class="text-sm text-gray-600">
                                ${disease.detection_count || 1} deteksi | 
                                Avg: ${(disease.confidence * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-right">
                        <div class="text-2xl font-bold text-black">
                            ${(disease.distribution_percentage || 0).toFixed(1)}%
                        </div>
                        <div class="text-sm text-gray-600">dari total</div>
                    </div>
                </div>
                
                <div class="w-full bg-gray-300 h-3 border-2 border-black">
                    <div class="h-full bg-gradient-to-r from-red-500 to-orange-500 border-r-2 border-black distribution-bar" 
                         style="width: ${(disease.distribution_percentage || 0)}%"></div>
                </div>
            `;
        });
        
        summaryHTML += `
            </div>
            <div class="mt-6 grid grid-cols-2 gap-4">
                <div class="bg-neon-pink border-2 border-black p-3 text-center">
                    <div class="text-xl font-bold text-black">${diseases.length}</div>
                    <div class="text-sm font-bold text-black">Jenis Penyakit</div>
                </div>
                <div class="bg-neon-blue border-2 border-black p-3 text-center">
                    <div class="text-xl font-bold text-black">
                        ${diseases.reduce((sum, d) => sum + (d.detection_count || 1), 0)}
                    </div>
                    <div class="text-sm font-bold text-black">Total Deteksi</div>
                </div>
            </div>
        `;
        
        summaryDiv.innerHTML = summaryHTML;
        diseaseContainer.appendChild(summaryDiv);
    }
    
    // Individual disease information
    diseases.forEach(disease => {
        const diseaseDiv = document.createElement('div');
        diseaseDiv.className = 'bg-black border-4 border-black neobrutalism-shadow-sm p-6 mb-4';
        
        // Determine priority
        let priorityClass = 'bg-blue-500';
        let priorityText = 'PANTAU';
        let priorityAction = `📋 PANTAU! Penyakit minor (${(disease.distribution_percentage || 0).toFixed(1)}%). Lakukan monitoring rutin dan pencegahan.`;
        
        const distributionPercentage = disease.distribution_percentage || 0;
        
        if (distributionPercentage >= 50) {
            priorityClass = 'bg-red-500';
            priorityText = 'TINGGI';
            priorityAction = `🚨 SEGERA! Penyakit ini dominan (${distributionPercentage.toFixed(1)}%). Lakukan penanganan intensif segera.`;
        } else if (distributionPercentage >= 30) {
            priorityClass = 'bg-yellow-500';
            priorityText = 'SEDANG';
            priorityAction = `⚠️ PENTING! Penyakit signifikan (${distributionPercentage.toFixed(1)}%). Rencanakan penanganan dalam 1-2 hari.`;
        }
        
        diseaseDiv.innerHTML = `
            <div class="text-center mb-4">
                <h4 class="text-3xl font-bold text-neon-green mb-2">
                    ${disease.icon} ${disease.name} 
                    ${diseases.length > 1 ? `<span class="text-neon-pink">(${distributionPercentage.toFixed(1)}%)</span>` : ''}
                </h4>
                
                <!-- Enhanced Stats -->
                <div class="grid grid-cols-2 ${diseases.length > 1 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-2 mt-4">
                    ${diseases.length > 1 ? `
                    <div class="bg-neon-blue border-2 border-white p-2">
                        <div class="text-black font-bold text-sm">Distribusi</div>
                        <div class="text-black font-bold">${distributionPercentage.toFixed(1)}%</div>
                    </div>` : ''}
                    <div class="bg-neon-yellow border-2 border-white p-2">
                        <div class="text-black font-bold text-sm">Confidence</div>
                        <div class="text-black font-bold">${(disease.confidence * 100).toFixed(1)}%</div>
                    </div>
                    <div class="bg-neon-pink border-2 border-white p-2">
                        <div class="text-black font-bold text-sm">Deteksi</div>
                        <div class="text-black font-bold">${disease.detection_count || 1}x</div>
                    </div>
                    <div class="bg-neon-green border-2 border-white p-2">
                        <div class="text-black font-bold text-sm">Prioritas</div>
                        <div class="text-black font-bold">${priorityText}</div>
                    </div>
                </div>
                
                <p class="text-white font-bold mt-2">${disease.description}</p>
            </div>

            <div class="bg-neon-green border-4 border-white neobrutalism-shadow-sm p-4 mb-4">
                <h5 class="text-xl font-bold text-black mb-3">💊 Saran Penanganan Segera:</h5>
                <div class="space-y-2">
                    ${disease.treatments.map(treatment => 
                        `<div class="treatment-item">
                            <p class="text-black font-bold flex items-start">
                                <span class="text-green-800 mr-2 font-bold">✓</span>
                                ${treatment}
                            </p>
                        </div>`
                    ).join('')}
                </div>
            </div>

            <div class="bg-neon-pink border-4 border-white neobrutalism-shadow-sm p-4 mb-4">
                <h5 class="text-xl font-bold text-black mb-3">🛡️ Tips Pencegahan:</h5>
                <div class="space-y-1">
                    ${disease.prevention.map(prevention => 
                        `<p class="text-black font-bold flex items-start text-sm">
                            <span class="text-purple-800 mr-2 font-bold">🔰</span>
                            ${prevention}
                        </p>`
                    ).join('')}
                </div>
            </div>
            
            <!-- Priority-based Action Recommendation -->
            <div class="mt-4 p-4 border-4 border-white ${priorityClass}">
                <h6 class="font-bold text-black text-lg mb-2">
                    ⚡ Tindakan Berdasarkan Prioritas:
                </h6>
                <p class="text-black font-bold">${priorityAction}</p>
            </div>
        `;
        
        diseaseContainer.appendChild(diseaseDiv);
    });
    
    diseaseSection.style.display = 'block';
}

function displayHealthyPlant() {
    const diseaseSection = document.getElementById('disease-info-section');
    const diseaseContainer = document.getElementById('disease-info-container');
    
    diseaseContainer.innerHTML = `
        <div class="bg-green-500 border-4 border-black neobrutalism-shadow-sm p-6 text-center">
            <h4 class="text-3xl font-bold text-black mb-2">✅ Tanaman Sehat!</h4>
            <p class="text-black font-bold text-lg mb-4">Tidak ada penyakit yang terdeteksi. Tanaman cabai Anda dalam kondisi baik!</p>
            
            <div class="bg-white border-2 border-black p-4">
                <h5 class="text-xl font-bold text-black mb-2">💡 Tips Perawatan Rutin:</h5>
                <ul class="text-black font-bold text-sm space-y-1 text-left">
                    <li>• Siram secara teratur sesuai kebutuhan</li>
                    <li>• Berikan pupuk seimbang setiap 2 minggu</li>
                    <li>• Periksa tanaman setiap 2-3 hari</li>
                    <li>• Jaga kebersihan area sekitar tanaman</li>
                </ul>
            </div>
        </div>
    `;
    
    diseaseSection.style.display = 'block';
}