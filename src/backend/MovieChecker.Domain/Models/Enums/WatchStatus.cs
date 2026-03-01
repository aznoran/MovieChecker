using System.Text.Json.Serialization;

namespace MovieChecker.Domain.Models.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum WatchStatus
{
    Planned,
    Watching,
    Completed,
    Dropped
}
