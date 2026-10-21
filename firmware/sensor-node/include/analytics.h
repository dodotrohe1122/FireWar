#ifndef ANALYTICS_H
#define ANALYTICS_H

#include "sensors.h"

enum class NodeStatus {
    NORMAL,         
    WARNING,        
    FIRE,          
    FAULT_OFFLINE  
};

struct AnalyticsData
{
    bool smokeDetected;
    bool flameDetected;
    bool tempDetected;
    bool fire;
    bool warning;
    
    // Sử dụng enum class thay cho chuỗi ký tự thô để tiết kiệm RAM và tối ưu so sánh
    NodeStatus status;
    
    // Hàm phụ trợ chuyển đổi enum sang chuỗi API/JSON khi cần gửi đi
    const char* getStatusString() const {
        switch (status) {
            case NodeStatus::NORMAL:         return "NORMAL";
            case NodeStatus::WARNING:        return "WARNING";
            case NodeStatus::FIRE:          return "FIRE";
            case NodeStatus::FAULT_OFFLINE:  return "FAULT_OFFLINE";
            default:                         return "UNKNOWN";
        }
    }
};

// =========================
// 3. KHAI BÁO HÀM PHÂN TÍCH
// =========================
AnalyticsData analyze_data(const SensorData& sensorData, bool isTimeout = false);

#endif // ANALYTICS_H