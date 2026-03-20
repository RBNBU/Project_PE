-- ==========================================================
-- 1. THE ARCHIVE FUNCTION (Stored Procedure)
-- This contains the logic to calculate and move data.
-- ==========================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS `sp_ArchiveDailyData`()
BEGIN
    -- Check if there is data from yesterday in the table
    IF (SELECT COUNT(*) FROM `current_data` WHERE `Timestamp` >= CURDATE() - INTERVAL 1 DAY AND `Timestamp` < CURDATE()) > 0 THEN
        
        -- Calculate statistics and insert them into the daily_statistics table
        INSERT INTO `daily_statistics` (
            `Callsign`, 
            `Date`, 
            `Beacon_Count`, 
            `Alarm_Count`, 
            `Max_Altitude`, 
            `Min_Altitude`, 
            `Average_Speed`, 
            `Max_Speed`, 
            `Average_Temp`, 
            `Min_Temp`, 
            `Max_Temp`, 
            `Total_Precipitation`
        )
        SELECT 
            `Callsign`, 
            CURDATE() - INTERVAL 1 DAY,          -- The date of yesterday
            COUNT(*),                            -- Total number of messages
            SUM(CASE WHEN `Alarm_Status` > 0 THEN 1 ELSE 0 END), -- Count alarms
            MAX(`Altitude`), 
            MIN(`Altitude`), 
            AVG(`Speed`), 
            MAX(`Speed`),
            AVG(`Temperature`), 
            MIN(`Temperature`), 
            MAX(`Temperature`), 
            SUM(`Precipitation`)                
        FROM `current_data`
        WHERE `Timestamp` >= CURDATE() - INTERVAL 1 DAY 
          AND `Timestamp` < CURDATE()
        GROUP BY `Callsign`;

        -- Delete old data from current_data to keep it clean and fast
        DELETE FROM `current_data` 
        WHERE `Timestamp` < CURDATE();
        
    END IF;
END //

DELIMITER ;

-- ==========================================================
-- 2. THE TIMER (Event)
-- This runs the function automatically every night.
-- ==========================================================

-- Enable the internal database scheduler
SET GLOBAL event_scheduler = ON;

-- Create the event that runs every day at 00:05 AM
CREATE EVENT IF NOT EXISTS `daily_archive_event`
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY + INTERVAL 5 MINUTE)
COMMENT 'Automatically runs the archive procedure every night'
DO
  CALL `sp_ArchiveDailyData`();