"""
数据管理器测试
"""

import pytest
from pathlib import Path
from modules.data_manager import DataManager


class TestDataManager:
    """数据管理器测试类"""
    
    @pytest.fixture
    def db_path(self, tmp_path):
        return tmp_path / "test.db"
    
    @pytest.fixture
    def manager(self, db_path):
        mgr = DataManager(db_path)
        yield mgr
        mgr.close()
    
    def test_initialization(self, manager, db_path):
        """测试初始化"""
        assert db_path.exists()
        assert manager.conn is not None
    
    def test_save_inspection_record(self, manager):
        """测试保存巡检记录"""
        record = {
            'task_id': 'task_001',
            'qr_code': 'QR001',
            'gps_latitude': 31.2304,
            'gps_longitude': 121.4737,
            'altitude': 100,
            'image_path': '/path/to/image.jpg',
            'image_size': 1024000,
            'detection_confidence': 0.95,
            'metadata': {'test': 'data'}
        }
        
        record_id = manager.save_inspection_record(record)
        assert record_id > 0
    
    def test_save_challenge_card(self, manager):
        """测试保存挑战卡"""
        card = {
            'task_id': 'task_001',
            'card_number': 1,
            'position_x': 100,
            'position_y': 0,
            'position_z': 100,
            'confidence': 0.85,
            'image_path': '/path/to/card.jpg',
            'metadata': {}
        }
        
        card_id = manager.save_challenge_card(card)
        assert card_id > 0
    
    def test_get_records_by_task(self, manager):
        """测试按任务获取记录"""
        # 保存测试记录
        for i in range(3):
            record = {
                'task_id': 'task_002',
                'qr_code': f'QR{i:03d}',
                'image_path': f'/path/to/image_{i}.jpg',
                'image_size': 1024000,
                'detection_confidence': 0.95
            }
            manager.save_inspection_record(record)
        
        # 获取记录
        records = manager.get_records_by_task('task_002')
        assert len(records) == 3
        assert records[0]['qr_code'] == 'QR000'
    
    def test_mark_as_uploaded(self, manager):
        """测试标记为已上传"""
        record = {
            'task_id': 'task_003',
            'qr_code': 'QR999',
            'image_path': '/path/to/image.jpg',
            'image_size': 1024000,
            'detection_confidence': 0.95
        }
        
        record_id = manager.save_inspection_record(record)
        manager.mark_as_uploaded(record_id)
        
        # 验证
        records = manager.get_unuploaded_records()
        uploaded_ids = [r['id'] for r in records]
        assert record_id not in uploaded_ids
    
    def test_statistics(self, manager):
        """测试统计信息"""
        stats = manager.get_statistics()
        assert 'total_records' in stats
        assert 'uploaded_records' in stats
        assert 'total_cards' in stats


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
